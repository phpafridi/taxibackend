import { LegalPage, H2, LEGAL } from "../../components/legal/LegalPage";

export const metadata = { title: "Delete your account – RS Private Hire" };

export default function DeleteAccount() {
  return (
    <LegalPage title="Delete your account">
      <H2>In the app</H2>
      <p>Open the app → <b>Me</b> → <b>Privacy &amp; data</b> → <b>Delete my account</b>, then enter your password to confirm. Your account is deleted straight away.</p>

      <H2>By email</H2>
      <p>
        If you can’t open the app, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the address on your
        account with the subject “Delete my account”. We may ask you to confirm who you are. We will respond within 30 days.
      </p>

      <H2>What is deleted</H2>
      <ul>
        <li>Your login and email, and you are signed out on every device</li>
        <li>Your profile photo and the photos of your documents</li>
        <li>Your push-notification token and location data</li>
      </ul>

      <H2>What we must keep</H2>
      <p>
        Signed agreements and payment records are kept for up to 6 years because UK law requires businesses to keep
        contract and financial records. If you signed an agreement, the details written on it (such as your name, phone,
        address, licence, date of birth, National Insurance number and emergency contact) are kept with it. If you never
        signed an agreement, those personal details are deleted too.
      </p>

      <H2>If you still have a car on hire</H2>
      <p>You can still delete your account. Your fleet manager is told straight away so they can arrange the car&apos;s return and close the agreement.</p>
    </LegalPage>
  );
}
