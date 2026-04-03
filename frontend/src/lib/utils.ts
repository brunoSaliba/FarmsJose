import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '@/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getLocale() {
  return i18n.resolvedLanguage === 'en' ? 'en-US' : 'pt-BR';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(getLocale());
}

export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCep(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

export function unmask(value: string): string {
  return value.replace(/\D/g, '');
}
