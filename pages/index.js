import { useState } from 'react'
import styles from '../styles/home.module.css'

const initialForm = {
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
  ssn: '',
  phone: '',
  email: '',
  birthday: '',
}

const OUTCOME_MESSAGES = {
  Approved: 'Success! Account Created',
  'Manual Review': "Thanks for submitting your application, we'll be in touch shortly",
  Denied: 'Sorry, your application was not approved',
}

function Home() {
  const [formData, setFormData] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [outcomeMessage, setOutcomeMessage] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'ssn') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 9)
      setFormData((current) => ({
        ...current,
        [name]: digitsOnly,
      }))
      return
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage('')
    setOutcomeMessage('')

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : await response.text()

      if (!response.ok) {
        const errorMessage =
          typeof data === 'string'
            ? data
            : data?.message || 'Something went wrong while submitting.'
        throw new Error(errorMessage)
      }

      const outcome = typeof data === 'object' && data !== null ? data.summary?.outcome : null
      setSubmitMessage('Form successfully submitted.')
      setOutcomeMessage(OUTCOME_MESSAGES[outcome] || 'Evaluation response received.')
      setFormData(initialForm)
    } catch (error) {
      setSubmitMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1>D.B. Cooper Savings & Loan</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>First name</span>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Last name</span>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                required
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2>Address</h2>
            <label className={styles.field}>
              <span>Address line 1</span>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                autoComplete="address-line1"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Address line 2 (optional)</span>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                autoComplete="address-line2"
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>City</span>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>State</span>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                  required
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>ZIP</span>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="^\d{5}(?:\d{4})?$"
                title="Enter a 5- or 9-digit ZIP code with no dashes."
                required
              />
            </label>

            <label className={styles.field}>
              <span>Country</span>
              <input
                type="text"
                name="country"
                value="US"
                readOnly
                required
              />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span>SSN (9 digits, no dashes)</span>
              <input
                type="text"
                name="ssn"
                value={formData.ssn}
                onChange={handleChange}
                inputMode="numeric"
                pattern="^\d{9}$"
                maxLength={9}
                title="Enter 9 digits with no dashes."
                required
              />
            </label>

            <label className={styles.field}>
              <span>Phone number</span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel-national"
                required
              />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Birthday (YYYY-MM-DD)</span>
              <input
                type="text"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                pattern="^\d{4}-\d{2}-\d{2}$"
                title="Use the YYYY-MM-DD format."
                required
              />
            </label>
          </div>

          <button className={styles.button} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {submitMessage ? <p className={styles.message}>{submitMessage}</p> : null}
        {outcomeMessage ? <p className={styles.message}>{outcomeMessage}</p> : null}
      </div>
    </main>
  )
}

export default Home
