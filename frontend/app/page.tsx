import { ChatLayout } from "@/components/chat/chat-layout"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-4xl">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🌾 Wouri Bot</h1>
          <p className="text-gray-600 dark:text-gray-400">Assistant agricole pour la Côte d'Ivoire</p>
        </div>
        <div className="h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <ChatLayout />
        </div>
      </div>
    </main>
  )
}
