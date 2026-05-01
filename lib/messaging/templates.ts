export function renderTemplate(
    template: string,
    contact: {
      name?: string | null
      phone?: string | null
      email?: string | null
      metadata?: Record<string, string> | null
    }
  ): string {
    const vars: Record<string, string> = {
      name: contact.name ?? 'there',
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      ...contact.metadata,
    }
  
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return vars[key] ?? `{{${key}}}`
    })
  }