import { LegalPage, H2, LEGAL } from "../../components/legal/LegalPage";

export const metadata = { title: "Terms of Use – RS Private Hire" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        These terms cover your use of the {LEGAL.company} app and website. By creating an account you agree to them and to our{" "}
        <a href="/privacy">Privacy Policy</a>. Your vehicle hire is governed separately by the hire, rental or insurance
        agreement you sign in the app.
      </p>

      <H2>Who can use the app</H2>
      <p>
        The app is for drivers and staff of {LEGAL.company}. You must be 18 or over and hold a valid licence to drive
        private hire vehicles where required. New drivers apply in the app and a manager must approve the application
        before the account can be used. We may refuse or end access at our discretion.
      </p>

      <H2>Your account</H2>
      <p>Give accurate information and keep it up to date. Keep your password private and tell us if you think someone else has used your account. You are responsible for what happens under your account.</p>

      <H2>Agreements, rent and payments</H2>
      <p>
        Agreements signed in the app are legally binding. Rent, deposits and charges shown in the app are as set out in
        your agreement. Payments you record in the app are pending until a manager confirms them. The app is a record
        keeping tool and does not take card payments.
      </p>

      <H2>Location</H2>
      <p>While you have an active hire, you agree that the app shares your location with your fleet manager as described in the Privacy Policy.</p>

      <H2>Acceptable use</H2>
      <p>Do not give false documents or information, share your account, try to access other people’s data, interfere with the service, or use it for anything unlawful.</p>

      <H2>Availability and liability</H2>
      <p>
        We try to keep the app running but do not promise it will always be available or error free. Nothing in these terms
        limits liability that cannot be limited by law, including for death or personal injury caused by negligence. Subject
        to that, we are not liable for indirect or consequential losses arising from use of the app.
      </p>

      <H2>Ending your account</H2>
      <p>You can delete your account at any time in the app once you have no active agreement or vehicle (see <a href="/delete-account">Delete your account</a>). We may suspend or close accounts that break these terms.</p>

      <H2>Changes, law and contact</H2>
      <p>We may update these terms and will ask you to accept the new version when the changes matter. These terms are governed by the law of England and Wales. Contact: {LEGAL.email}.</p>
    </LegalPage>
  );
}
