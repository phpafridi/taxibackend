import { LegalPage, H2, LEGAL } from "../../components/legal/LegalPage";

export const metadata = { title: "Delete your account – RS Private Hire" };

export default function DeleteAccount() {
  return (
    <LegalPage title="Delete your account">
      <H2>In the app</H2>
      <p>Open the app → <b>Profile</b> → <b>Delete my account</b>, then enter your password to confirm.</p>

      <H2>By email</H2>
      <p>
        If you can’t open the app, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the address on your
        account with the subject “Delete my account”. We may ask you to confirm who you are. We will respond within 30 days.
      </p>

      <H2>What is deleted</H2>
      <ul>
        <li>Your name, email, phone number, profile photo and login</li>
        <li>Your licence details, date of birth, address, National Insurance number and emergency contact</li>
        <li>Photos of your documents</li>
        <li>Your push-notification token and location data</li>
      </ul>

      <H2>What we must keep</H2>
      <p>
        Signed agreements and payment records are kept for up to 6 years because UK law requires businesses to keep
        contract and financial records. Your account and login are closed, but these records may still contain your name as written in the agreement.
      </p>

      <H2>Before you delete</H2>
      <p>If you still have an active agreement or a vehicle, your fleet manager must end it first.</p>
    </LegalPage>
  );
}
