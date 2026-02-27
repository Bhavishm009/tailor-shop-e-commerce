export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validatePhone(phone: string): boolean {
  const re = /^[6-9]\d{9}$/
  return re.test(phone)
}

export function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")

  if (digits.length === 10) {
    return digits
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1)
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2)
  }

  return ""
}

export function validateIndianMobile(phone: string): boolean {
  const normalized = normalizeIndianPhone(phone)
  return validatePhone(normalized)
}

export function validateMeasurement(measurement: Record<string, any>): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (!measurement.name || measurement.name.trim() === "") {
    errors.name = "Measurement profile name is required"
  }

  const numericFields = ["chest", "waist", "hip", "shoulder", "sleeveLength", "garmentLength"]
  for (const field of numericFields) {
    if (measurement[field] && isNaN(Number.parseFloat(measurement[field]))) {
      errors[field] = `${field} must be a valid number`
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
