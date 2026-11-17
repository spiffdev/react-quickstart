/** Whether this looks like an email address: something, an @, something, a dot, something. */
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
