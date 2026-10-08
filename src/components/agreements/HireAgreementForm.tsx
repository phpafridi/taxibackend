
import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';

interface HireAgreementFormProps {
  driverProfile: {
    id: number;
    user: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  car?: {
    id: number;
    registration: string;
    model: string;
    make?: string;
    bodyType?: string;
    weeklyAmount?: number;
  };
  onSubmit: (data: HireAgreementData) => Promise<void>;
}

interface HireAgreementData {
  driverName: string;
  address: string;
  postcode: string;
  licenseNumber: string;
  licenseExpiry: string;
  weeklyRate: number;
  deposit: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleReg: string;
  bodyType: string;
  startDate: string;
  endDate: string;
  signature: string;
}

export default function HireAgreementForm({ driverProfile, car, onSubmit }: HireAgreementFormProps) {
  const [step, setStep] = useState(1);
  const [agreementData, setAgreementData] = useState<Partial<HireAgreementData>>({
    driverName: driverProfile.user.name,
    weeklyRate: 0,
    vehicleReg: car?.registration || '',
    vehicleModel: car?.model || '',
    vehicleMake: car?.make || '',
    bodyType: car?.bodyType || '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });
  
  const sigCanvas = React.useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setAgreementData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSaveSignature = () => {
    if (sigCanvas.current) {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      setAgreementData(prev => ({ ...prev, signature: signatureData }));
      setIsSigning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementData.signature) {
      alert('Please provide your signature');
      return;
    }
    
    await onSubmit(agreementData as HireAgreementData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Hire Agreement</h1>
      
      <div className="mb-8">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold">RS PRIVATE HIRE LTD</h2>
          <p>07904388925</p>
          <p>rsprivatehireltd@gmail.com</p>
        </div>
        
        <div className="border-t border-b py-2 mb-4">
          <div className="flex justify-between">
            <span className="font-semibold">Non Regulated</span>
            <span>12 Months</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-4">Customer's Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    name="driverName"
                    value={agreementData.driverName || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Driver's License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={agreementData.licenseNumber || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={agreementData.address || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    name="licenseExpiry"
                    value={agreementData.licenseExpiry || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Postcode</label>
                  <input
                    type="text"
                    name="postcode"
                    value={agreementData.postcode || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-4">Vehicle Rates & Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Make</label>
                  <input
                    type="text"
                    name="vehicleMake"
                    value={agreementData.vehicleMake || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={agreementData.vehicleModel || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Registration</label>
                  <input
                    type="text"
                    name="vehicleReg"
                    value={agreementData.vehicleReg || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Type of Body</label>
                  <input
                    type="text"
                    name="bodyType"
                    value={agreementData.bodyType || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Weekly Rate (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="weeklyRate"
                    value={agreementData.weeklyRate || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Deposit (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="deposit"
                    value={agreementData.deposit || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
            >
              Next: Terms & Conditions
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-4">Terms & Conditions</h3>
              
              <div className="prose max-w-none">
                <p className="mb-4">
                  I hereby warrant the truth of the above statements and I declare that I have not withheld any information...
                </p>
                
                <div className="space-y-2 mb-4">
                  <p>I accept full responsibility and agree to pay on demand for:</p>
                  <ul className="list-disc pl-5">
                    <li>Any additional damage whatsoever</li>
                    <li>Any policy excess applicable as demand up to £15,000.00</li>
                    <li>Any fuel required</li>
                    <li>Valeting charge as required</li>
                  </ul>
                </div>
                
                <p className="mb-4">
                  I have read and understand the terms & conditions appearing on the front and reverse hereof...
                </p>
              </div>
              
              <div className="mt-4 p-4 border rounded">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    required
                    className="mr-2"
                  />
                  <span>I have read and agree to the Terms & Conditions</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-4">Signature</h3>
              
              {!isSigning ? (
                <div>
                  {agreementData.signature ? (
                    <div className="mb-4">
                      <p className="mb-2">Signature provided:</p>
                      <img 
                        src={agreementData.signature} 
                        alt="Signature" 
                        className="border p-2 bg-white"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  ) : (
                    <p className="mb-4">Please sign below to accept the agreement</p>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setIsSigning(true)}
                    className="bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-900 transition"
                  >
                    {agreementData.signature ? 'Resign' : 'Sign Now'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="border rounded p-2 bg-white mb-4">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: 'w-full h-48 border',
                        style: { touchAction: 'none' }
                      }}
                      penColor="black"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleClearSignature}
                      className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSignature}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={agreementData.startDate || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={agreementData.endDate || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border rounded hover:bg-gray-100 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!agreementData.signature}
                className={`flex-1 py-2 px-4 rounded transition ${
                  agreementData.signature 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Submit Agreement
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}