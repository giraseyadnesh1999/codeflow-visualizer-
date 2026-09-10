import type { Metadata } from 'next'
import { PracticeApp } from '@/components/practice/PracticeApp'

export const metadata: Metadata = {
  title: 'Daily DSA Practice — CodeFlow',
  description: 'Two new array and string problems every day, with tests, hints, solutions and step-by-step visualization.',
}

export default function PracticePage() {
  return <PracticeApp />
}
