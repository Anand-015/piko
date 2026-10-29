import type { DemoForm } from './assistant.types'

// Reserved example origin and fictional contact details; never taken from a tab.
export const demoForm: DemoForm = {
  title: 'Demo Registration Form',
  origin: 'https://forms.example.test',
  fields: [
    { fieldId: 'demo-name', label: 'Full name', type: 'text', required: true },
    { fieldId: 'demo-email', label: 'Email address', type: 'email', required: true },
    { fieldId: 'demo-phone', label: 'Phone number', type: 'tel', required: false },
    {
      fieldId: 'demo-contact', label: 'Contact preference', type: 'select', required: false,
      options: [{ value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }, { value: 'sms', label: 'SMS' }],
    },
    { fieldId: 'demo-organization', label: 'Organization', type: 'text', required: true },
  ],
}

export const demoQuestion = 'What is your full name and email address? You can also provide a phone number and contact preference.'
export const demoAnswer = 'My name is Alex Thomas, my email is alex@example.test, my phone is +1 202-555-0142, and I prefer email.'
export const demoValues: Record<string, string> = {
  'demo-name': 'Alex Thomas',
  'demo-email': 'alex@example.test',
  'demo-phone': '+1 202-555-0142',
  'demo-contact': 'email',
  // Organization is deliberately unknown. Never fill this gap from a fixture.
}
