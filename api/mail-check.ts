import nodemailer from 'nodemailer';

export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, nodemailer: Boolean(nodemailer?.createTransport) });
}
