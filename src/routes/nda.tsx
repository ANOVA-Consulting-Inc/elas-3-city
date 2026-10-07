import { createFileRoute } from '@tanstack/react-router'
import { NdaLandingPage } from '@/components/nda/LandingPage'

export const Route = createFileRoute('/nda')({
  component: NdaLandingPage,
  meta: {
    title: 'ELAS-3-CITY NDA Agreement',
    description: 'Non-disclosure agreement for ELAS-3-CITY platform access',
  },
})