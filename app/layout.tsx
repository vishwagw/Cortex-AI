import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Cortex — Drone Autonomy', template: '%s | Cortex' },
  description: 'Universal autonomy-as-a-service for drones. Computer vision navigation, AI path planning, reinforcement learning.',
  keywords: ['drone autonomy', 'autonomous drone', 'computer vision', 'path planning', 'MAVLink', 'ArduPilot', 'ROS'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-app-bg text-slate-200 antialiased">
        {children}
      </body>
    </html>
  )
}
