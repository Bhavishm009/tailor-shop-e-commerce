import nodemailer from "nodemailer"

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const portRaw = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM

  if (!host || !portRaw || !user || !pass || !from) {
    return null
  }

  const port = Number(portRaw)
  if (!Number.isFinite(port)) {
    return null
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  }
}

async function sendEmail(params: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const smtpConfig = getSmtpConfig()

  if (!smtpConfig) {
    return process.env.NODE_ENV !== "production"
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth,
  })

  await transporter.sendMail({
    from: smtpConfig.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  })

  return true
}

export async function sendLoginOtpEmail(email: string, otp: string) {
  const smtpConfig = getSmtpConfig()

  if (!smtpConfig) {
    console.info(`[auth/otp] SMTP not configured. OTP for ${email}: ${otp}`)
    return process.env.NODE_ENV !== "production"
  }

  return sendEmail({
    to: email,
    subject: "Your TailorHub login OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
  })
}

export async function sendBirthdayWishEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Happy Birthday from TailorHub!",
    text: `Happy Birthday ${name}! Wishing you a wonderful day from Team TailorHub.`,
    html: `<p>Happy Birthday <strong>${name}</strong>!</p><p>Wishing you a wonderful day from Team TailorHub.</p>`,
  })
}
