'use client'

import { Calendar, Clock, Users, Settings } from 'lucide-react'

export type TabId = 'confirmadas' | 'em-espera' | 'contatos' | 'ferramentas'

interface Tab {
    id: TabId
    label: string
    icon: React.ReactNode
}

const tabs: Tab[] = [
    { id: 'confirmadas', label: 'Confirmadas', icon: <Calendar size={20} /> },
    { id: 'em-espera', label: 'Em espera', icon: <Clock size={20} /> },
    { id: 'contatos', label: 'Contatos', icon: <Users size={20} /> },
    { id: 'ferramentas', label: 'Ferramentas', icon: <Settings size={20} /> },
]

interface BottomNavProps {
    activeTab: TabId
    onTabChange: (tab: TabId) => void
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors
                ${isActive
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'}
              `}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <span className={isActive ? 'scale-110 transition-transform' : ''}>
                                {tab.icon}
                            </span>
                            <span className="text-xs mt-1 font-medium">{tab.label}</span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
