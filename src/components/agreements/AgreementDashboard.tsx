
import { useState, useEffect } from 'react';
import HireAgreementForm from './HireAgreementForm';
import InsuranceCertificateForm from './InsuranceCertificateForm';

interface AgreementDashboardProps {
  driverId: number;
}

export default function AgreementDashboard({ driverId }: AgreementDashboardProps) {
  const [activeAgreement, setActiveAgreement] = useState<'hire' | 'insurance' | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverProfile();
  }, [driverId]);

  const fetchDriverProfile = async () => {
    try {
      const response = await fetch(`/api/driver/profile/${driverId}`);
      const data = await response.json();
      setDriverProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHireAgreementSubmit = async (data: any) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'signature') {
        // Convert signature to blob
        const blob = dataURItoBlob(data.signature);
        formData.append('signature', blob, 'signature.png');
      } else {
        formData.append(key, data[key]);
      }
    });
    formData.append('type', 'HIRE_AGREEMENT');
    formData.append('driverProfileId', driverProfile.id.toString());

    const response = await fetch('/api/agreements/submit', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      alert('Hire agreement submitted successfully!');
      setActiveAgreement(null);
      fetchDriverProfile(); // Refresh data
    }
  };

  const handleInsuranceCertificateSubmit = async (data: any) => {
    // Similar implementation for insurance certificate
  };

  function dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Driver Agreements</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Hire Agreement</h2>
          <p className="mb-4">Complete the vehicle hire agreement form.</p>
          <button
            onClick={() => setActiveAgreement('hire')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {driverProfile?.agreementSigned ? 'View/Update Agreement' : 'Sign Agreement'}
          </button>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Insurance Certificate</h2>
          <p className="mb-4">Authorize vehicle use for private hire.</p>
          <button
            onClick={() => setActiveAgreement('insurance')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Sign Agreement
          </button>
        </div>
      </div>
      
      {activeAgreement === 'hire' && (
        <HireAgreementForm
          driverProfile={driverProfile}
          car={driverProfile?.cars?.[0]}
          onSubmit={handleHireAgreementSubmit}
        />
      )}
      
      {activeAgreement === 'insurance' && (
        <InsuranceCertificateForm
          driverProfile={driverProfile}
          insurance={driverProfile?.insurances?.[0]}
          car={driverProfile?.cars?.[0]}
          onSubmit={handleInsuranceCertificateSubmit}
        />
      )}
    </div>
  );
}