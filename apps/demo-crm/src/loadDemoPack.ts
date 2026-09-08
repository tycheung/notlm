import { loadPackFromJson } from '@uipilot/core';

export function loadDemoCrmPack() {
  return loadPackFromJson({
    manifest: { id: 'demo-crm' },
    flow: [
      {
        id: 'add_contact',
        title: 'Add contact',
        keywords: ['contact', 'add', 'new contact'],
        kind: 'hard',
        requires: [],
      },
      {
        id: 'save_contact',
        title: 'Save contact',
        keywords: ['save', 'submit'],
        kind: 'hard',
        requires: ['add_contact'],
      },
    ],
    controls: [
      {
        id: 'guide-add-contact',
        stepId: 'add_contact',
        path: 'guide-add-contact',
        spotlight: 'guide-add-contact',
        coachMessage: 'Click Add contact — coach only presses UI (no CRM API).',
      },
      {
        id: 'guide-save-contact',
        stepId: 'save_contact',
        path: 'guide-save-contact',
        spotlight: 'guide-save-contact',
        coachMessage: 'Click Save contact to commit the draft via the form button.',
      },
    ],
    intents: {
      aliases: {
        add_contact: ['add contact', 'new contact', 'create contact'],
        save_contact: ['save contact', 'save', 'submit contact'],
      },
      meta: ['whats_next', 'go_back', 'explain_field'],
    },
    binders: {
      add_contact: { path: 'data.draftOpen', op: 'truthy' },
      save_contact: { path: 'data.contactCount', op: 'gte', value: 1 },
    },
    glossary: [
      {
        id: 'contact_name',
        aliases: ['name', 'contact name'],
        text: 'Name is the contact’s display name in the draft form.',
        guideId: 'guide-contact-name',
      },
      {
        id: 'contact_email',
        aliases: ['email', 'contact email'],
        text: 'Email is the contact’s address saved with the draft.',
        guideId: 'guide-contact-email',
      },
    ],
  });
}
