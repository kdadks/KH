import React, { useState } from 'react';
import { UserCustomer } from '../../types/userManagement';
import { 
  ChevronDown, 
  User,
  Users
} from 'lucide-react';

interface PatientSelectorProps {
  allPatients: UserCustomer[];
  activePatient: UserCustomer | null;
  onPatientSwitch: (patientId: number) => void;
  viewMode?: 'individual' | 'consolidated';
  onViewModeChange?: (mode: 'individual' | 'consolidated') => void;
  className?: string;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
  allPatients,
  activePatient,
  onPatientSwitch,
  viewMode = 'individual',
  onViewModeChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatPatientName = (patient: UserCustomer) => 
    `${patient.first_name} ${patient.last_name}`;

  if (allPatients.length <= 1) {
    // Don't show selector if there's only one patient
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Patient Display / Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            viewMode === 'consolidated' ? 'bg-blue-100' : 'bg-blue-100'
          }`}>
            {viewMode === 'consolidated' ? (
              <Users className="w-3 h-3 text-blue-600" />
            ) : (
              <User className="w-3 h-3 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="font-medium text-gray-900 text-sm truncate block">
              {viewMode === 'consolidated' 
                ? 'ALL Patients'
                : (activePatient ? formatPatientName(activePatient) : 'Select Patient')
              }
            </span>
            {allPatients.length > 1 && (
              <span className="text-xs text-gray-500">
                {allPatients.length} patients
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
            <div className="py-1">
              {/* ALL Patients Option */}
              <button
                onClick={() => {
                  if (onViewModeChange) {
                    onViewModeChange('consolidated');
                  }
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors ${
                  viewMode === 'consolidated' ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    viewMode === 'consolidated' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-3 h-3 ${viewMode === 'consolidated' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium text-sm truncate ${
                        viewMode === 'consolidated' ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        ALL Patients
                      </p>
                      {viewMode === 'consolidated' && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Consolidated view
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Separator */}
              <div className="border-t border-gray-100 my-1"></div>
              
              {/* Individual Patients */}
              {allPatients.map((patient) => {
                const isActive = viewMode === 'individual' && activePatient?.id === patient.id;

                return (
                  <button
                    key={patient.id}
                    onClick={() => {
                      if (onViewModeChange) {
                        onViewModeChange('individual');
                      }
                      onPatientSwitch(patient.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <User className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium text-sm truncate ${
                            isActive ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {formatPatientName(patient)}
                          </p>
                          {isActive && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PatientSelector;