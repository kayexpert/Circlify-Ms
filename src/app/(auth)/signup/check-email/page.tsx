import { CheckEmailPageClient } from './check-email-page-client';

export const metadata = {
  title: 'Check Your Email - Circlify',
  description: 'Verify your email to complete registration',
};

import { Suspense } from 'react';
import { Loader } from '@/components/ui/loader';

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader /></div>}>
      <CheckEmailPageClient />
    </Suspense>
  );
}
