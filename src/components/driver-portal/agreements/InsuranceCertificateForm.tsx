
import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface InsuranceCertificateFormProps {
  driverProfile: {
    id: number;
    user: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  insurance: {
    id: number;
    policyNo: string;
    provider: string;
  };
  car: {
    id: number;
    registration: string;
    model: string;
  };
  onSubmit: (data: InsuranceCertificateData) => Promise<void>;
}

interface InsuranceCertificateData {
  driverName: string;
  licenseNumber: string;
  address: string;
  vehicleMakeModel: string;
  vehicleReg: string;
  startDate: string;
  endDate: string;
  insurancePolicyNo: string;
  signature: string;
  printedName: string;
}

export default function InsuranceCertificateForm({ 
  driverProfile, 
  insurance, 
  car, 
  onSubmit 
}: InsuranceCertificateFormProps) {
  const [formData, setFormData] = useState<Partial<InsuranceCertificateData>>({
    driverName: driverProfile.user.name,
    vehicleReg: car.registration,
    vehicleMakeModel: car.model,
    insurancePolicyNo: insurance.policyNo,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.signature) {
      alert('Please provide your signature');
      return;
    }
    
    await onSubmit(formData as InsuranceCertificateData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Insurance Certificate Use Agreement</h1>
      
      <div className="mb-8">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold">R S CAR RENTALS LTD</h2>
          <p>07984650186</p>
          <p>atanveer@hotmail.co.uk</p>
        </div>
        
        <div className="text-right mb-4">
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={new Date().toISOString().split('T')[0]}
            className="p-2 border rounded"
            readOnly
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-gray-50 p-4 rounded mb-6">
          <p className="mb-4">
            To Whom it May Concern,
          </p>
          <p className="mb-4">
            We confirm that the below vehicle can be used for the carriage of passengers for hire and reward 
            by prior appointment (private hire) also food and parcel deliveries.
          </p>
          <p className="mb-4">
            We authorise and give permission to the following individual to use the vehicle for ALL private hire appointments, 
            including any trips taken through the uber and bolt platform also food and deliveries taken through the uber and bolt platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Registration</label>
              <input
                type="text"
                value={formData.vehicleReg || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleReg: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Make & Model</label>
              <input
                type="text"
                value={formData.vehicleMakeModel || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleMakeModel: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Driver Name</label>
              <input
                type="text"
                value={formData.driverName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Driving License Number</label>
              <input
                type="text"
                value={formData.licenseNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-2 border rounded"
                rows={3}
                required
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hire Start Date</label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Hire End Date</label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-sm font-medium mb-1">Insurance Policy Number</label>
              <input
                type="text"
                value={formData.insurancePolicyNo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, insurancePolicyNo: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded mb-6">
          <h3 className="font-bold mb-4">Signature Section</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Signature</label>
              <div className="border rounded p-2 bg-white">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: 'w-full h-32 border',
                    style: { touchAction: 'none' }
                  }}
                  penColor="black"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => sigCanvas.current?.clear()}
                  className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sigCanvas.current) {
                      const signature = sigCanvas.current.toDataURL('image/png');
                      setFormData(prev => ({ ...prev, signature }));
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Save Signature
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Print Name</label>
              <input
                type="text"
                value={formData.printedName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, printedName: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Regards</label>
                <div className="p-2 border rounded bg-white">
                  <p className="font-semibold">R S Car Rentals Ltd</p>
                </div>
              </div>
            </div>
          </div>
          
          {formData.signature && (
            <div className="mt-4 p-4 border rounded">
              <p className="text-sm font-medium mb-2">Signature Preview:</p>
              <img 
                src={formData.signature} 
                alt="Signature" 
                className="border p-2 bg-white"
                style={{ maxHeight: '100px' }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!formData.signature}
            className={`px-6 py-3 rounded-lg transition ${
              formData.signature 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Submit Agreement
          </button>
        </div>
      </form>
    </div>
  );
}