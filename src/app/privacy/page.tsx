import { LegalPage, H2, LEGAL } from "../../components/legal/LegalPage";

export const metadata = { title: "Privacy Policy – RS Private Hire" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains how {LEGAL.company} (“we”, “us”) collects and uses personal information when you use our mobile
        app and website. We are the data controller. We follow UK GDPR and the Data Protection Act 2018. The app is for
        drivers and staff of {LEGAL.company}.
      </p>

      <H2>What we collect</H2>
      <ul>
        <li><b>Account details:</b> name, email address, phone number, password (stored encrypted), profile photo.</li>
        <li><b>Driver details:</b> driving licence number and expiry, date of birth, home address and postcode, National Insurance number, emergency contact, and photos of your licence, proof of address and a photo of you.</li>
        <li><b>Agreements and payments:</b> hire, rental and insurance agreements (including your signature), weekly rent, deposits, payment records and receipt photos, maintenance requests and their photos.</li>
        <li><b>Location:</b> while you have an active hire agreement, the app shares your phone’s location with your fleet manager, including in the background. We do not collect location from managers, or from drivers without an active hire.</li>
        <li><b>Device information:</b> a push-notification token so we can send you rent reminders and fleet updates, and basic technical logs.</li>
      </ul>

      <H2>Why we use it</H2>
      <ul>
        <li>To assess and approve your application and to run your hire (contract).</li>
        <li>To manage rent, payments, insurance, vehicle safety and maintenance (contract and legitimate interests).</li>
        <li>To meet legal duties such as licensing, tax and accounting records (legal obligation).</li>
        <li>To keep vehicles and drivers safe and to recover vehicles (legitimate interests).</li>
        <li>To send service notifications. We do not send advertising and we do not sell your data.</li>
      </ul>

      <H2>Who sees it</H2>
      <p>
        Only authorised {LEGAL.company} managers and you. We use trusted providers to run the service, such as hosting,
        email and push-notification delivery (Expo and Google/Apple notification services). We share information with
        insurers, licensing authorities or the police only where needed for your hire or required by law.
      </p>

      <H2>How long we keep it</H2>
      <p>
        Application photos and personal details are kept while your account is active. If you delete your account, we erase
        your personal details, photos, push token and location. We keep signed agreements and payment records for up to 6
        years because UK law requires businesses to keep financial and contract records. Those records may still contain your
        name as written in the agreement, but your account and login are closed. If your application was rejected, you can
        ask us to delete it by emailing us.
      </p>

      <H2>Your rights</H2>
      <p>
        You can ask to see, correct, export or delete your information, object to its use, or complain to the Information
        Commissioner’s Office (ico.org.uk). You can delete your account in the app (Profile → Delete my account) or see{" "}
        <a href="/delete-account">how to delete your account</a>. You can also email {LEGAL.email}.
      </p>

      <H2>Location in detail</H2>
      <p>
        Location is used only so your fleet manager can see where the hired vehicle is. You can turn off location in your
        phone settings at any time. Doing so may stop us supporting your hire and may breach your agreement.
      </p>

      <H2>Security</H2>
      <p>Data is sent over encrypted connections and access is limited to authorised staff. No system is perfectly secure, so please keep your password private.</p>

      <H2>Children</H2>
      <p>The app is not for anyone under 18.</p>

      <H2>Changes and contact</H2>
      <p>We will update this page if our practices change. Contact: {LEGAL.email}, {LEGAL.address}.</p>
    </LegalPage>
  );
}
