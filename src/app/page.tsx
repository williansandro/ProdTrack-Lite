import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
  return null; // Or a loading spinner, but redirect is usually fast enough
}
