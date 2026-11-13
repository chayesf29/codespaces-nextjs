const REQUIRED_FIELDS = [
  'firstName',
  'lastName',
  'addressLine1',
  'city',
  'state',
  'zip',
  'ssn',
  'phone',
  'email',
  'birthday',
]

const ALLOY_FIELD_MAP = {
  firstName: 'name_first',
  lastName: 'name_last',
  addressLine1: 'address_line_1',
  addressLine2: 'address_line_2',
  city: 'address_city',
  state: 'address_state',
  zip: 'address_postal_code',
  country: 'address_country_code',
  ssn: 'document_ssn',
  phone: 'phone_number',
  email: 'email_address',
  birthday: 'birth_date',
}

const ALLOY_API_BASE_URL = 'https://sandbox.alloy.co/v1'

function getMissingFields(formData) {
  return REQUIRED_FIELDS.filter((field) => {
    const value = formData[field]
    return typeof value !== 'string' || value.trim() === ''
  })
}

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  return { body, contentType }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed. Use POST.' })
  }

  const workflowToken = process.env.ALLOY_WORKFLOW_TOKEN
  const workflowSecret = process.env.ALLOY_WORKFLOW_SECRET

  if (!workflowToken || !workflowSecret) {
    return res
      .status(500)
      .json({ message: 'Missing Alloy workflow credentials in environment configuration.' })
  }

  const formData = req.body

  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return res.status(400).json({ message: 'Invalid request payload.' })
  }

  const missingFields = getMissingFields(formData)
  if (missingFields.length > 0) {
    return res.status(400).json({
      message: 'Missing required form fields.',
      missingFields,
    })
  }

  try {
    const headers = {
      Authorization: `Basic ${Buffer.from(`${workflowToken}:${workflowSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    }

    const parametersResponse = await fetch(`${ALLOY_API_BASE_URL}/parameters/`, {
      headers,
    })
    const parametersResult = await readResponseBody(parametersResponse)

    if (!parametersResponse.ok) {
      return res.status(parametersResponse.status).json(parametersResult.body)
    }

    const parameters = parametersResult.body
    if (
      !parameters ||
      typeof parameters !== 'object' ||
      !Array.isArray(parameters.required) ||
      !Array.isArray(parameters.optional)
    ) {
      return res.status(502).json({ message: 'Alloy returned an invalid evaluation parameter response.' })
    }

    const parameterKeys = [
      ...parameters.required,
      ...parameters.optional,
      ...(parameters.or || []).flatMap((group) => group.required || []),
    ].map((parameter) => parameter.key)

    if (parameterKeys.length === 0) {
      return res.status(502).json({ message: 'Alloy returned no evaluation parameters.' })
    }

    const mappedFormData = Object.fromEntries(
      Object.entries(ALLOY_FIELD_MAP)
        .filter(([formField, alloyField]) => parameterKeys.includes(alloyField) && formData[formField])
        .map(([formField, alloyField]) => [alloyField, formData[formField]]),
    )
    const missingAlloyFields = parameters.required
      .map((parameter) => parameter.key)
      .filter((key) => typeof key === 'string' && !mappedFormData[key])

    if (missingAlloyFields.length > 0) {
      return res.status(400).json({
        message: 'The form is missing fields required by the Alloy workflow.',
        missingFields: missingAlloyFields,
      })
    }

    const evaluationResponse = await fetch(`${ALLOY_API_BASE_URL}/evaluations/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mappedFormData),
    })
    const evaluationResult = await readResponseBody(evaluationResponse)

    if (evaluationResult.contentType) {
      res.setHeader('Content-Type', evaluationResult.contentType)
    }
    return res.status(evaluationResponse.status).send(evaluationResult.body)
  } catch (error) {
    return res.status(502).json({
      message: 'Failed to reach the Alloy API.',
      details: error.message,
    })
  }
}
