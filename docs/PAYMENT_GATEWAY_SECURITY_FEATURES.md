# Payment Gateway Security Features

## Overview

The Payment Gateway Management interface now includes enhanced security features to protect sensitive payment gateway credentials during creation and editing operations.

## Features Implemented

### 🔐 View/Hide Toggle for Sensitive Fields

The following sensitive fields now include show/hide functionality:

1. **API Key** - Protected with password input type and toggle visibility
2. **Secret Key** - Protected with password input type and toggle visibility  
3. **Client ID** (PayPal) - Protected with password input type and toggle visibility
4. **Merchant Code** (SumUp) - Protected with password input type and toggle visibility

### 🎯 User Interface

#### Form Fields (Create/Edit Gateway)
- Each sensitive field includes an eye icon button to toggle visibility
- Fields default to hidden (password type) for security
- Eye icon changes to eye-off when field is visible
- Toggle state is independent for each field

#### Gateway Display (Existing Gateways)
- All sensitive fields are masked by default using `maskSecret()` function
- Single toggle button controls visibility for all fields of a gateway
- Masked format: `abcd••••••••wxyz` (first 4 + last 4 characters visible)
- Toggle state is managed per gateway ID

### 🛡️ Security Benefits

1. **Screen Protection** - Prevents accidental exposure during screen sharing
2. **Shoulder Surfing Prevention** - Protects against visual eavesdropping
3. **Selective Disclosure** - Admin can choose when to reveal sensitive data
4. **Per-Field Control** - Independent visibility control for each sensitive field

## Implementation Details

### State Management
```typescript
const [showFormApiKey, setShowFormApiKey] = useState(false);
const [showFormSecretKey, setShowFormSecretKey] = useState(false);
const [showFormClientId, setShowFormClientId] = useState(false);
const [showFormMerchantId, setShowFormMerchantId] = useState(false);
const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
```

### Input Field Pattern
```tsx
<div className="relative">
  <input
    type={showFormApiKey ? "text" : "password"}
    value={formData.api_key}
    onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="Enter API key"
  />
  <button
    type="button"
    onClick={() => setShowFormApiKey(!showFormApiKey)}
    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
  >
    {showFormApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </button>
</div>
```

### Masking Function
```typescript
const maskSecret = (secret: string) => {
  if (!secret) return 'Not set';
  if (secret.length <= 8) return '••••••••';
  return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
};
```

## Usage Instructions

### For Administrators

1. **Creating New Gateway**:
   - Navigate to Admin Console → Payment Management → Payment Gateways
   - Click "Add Gateway" 
   - Fill in sensitive fields (they appear masked by default)
   - Click eye icon next to any field to toggle visibility
   - Save the gateway configuration

2. **Editing Existing Gateway**:
   - Click "Edit" on any existing gateway
   - Sensitive fields load masked for security
   - Use eye icons to reveal values when needed
   - Make changes and save

3. **Viewing Gateway Details**:
   - Sensitive fields are masked in the gateway list
   - Click the eye icon to reveal all sensitive fields for that gateway
   - Click again to hide them

## Security Best Practices

1. **Minimize Exposure Time** - Only reveal sensitive data when necessary
2. **Secure Environment** - Ensure you're in a private setting when revealing credentials
3. **Quick Toggle** - Use the hide function immediately after viewing
4. **Regular Audits** - Periodically review and rotate payment gateway credentials

## Technical Notes

- Form state resets visibility toggles when opening create/edit modals
- Each gateway has independent visibility state for viewing mode
- No sensitive data is logged or exposed in console outputs
- All fields maintain proper form validation regardless of visibility state
