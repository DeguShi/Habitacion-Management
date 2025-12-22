'use client'

import { Calendar, Clock, Users, Settings, Plus, CheckCircle } from 'lucide-react'

export type TabId = 'confirmadas' | 'em-espera' | 'finalizadas' | 'contatos' | 'ferramentas'

interface Tab {
    id: TabId
    label: string
    icon: React.ReactNode
}

const tabs: Tab[] = [
    { id: 'confirmadas', label: 'Confirmadas', icon: <Calendar size={20} /> },
    { id: 'em-espera', label: 'Em espera', icon: <Clock size={20} /> },
    { id: 'finalizadas', label: 'Finalizadas', icon: <CheckCircle size={20} /> },
    { id: 'contatos', label: 'Contatos', icon: <Users size={20} /> },
    { id: 'ferramentas', label: 'Ferramentas', icon: <Settings size={20} /> },
]

interface BottomNavProps {
    activeTab: TabId
    onTabChange: (tab: TabId) => void
    onCreateClick?: () => void
    finishedCount?: number // Badge for pending finished items
}

export default function BottomNav({ activeTab, onTabChange, onCreateClick, finishedCount }: BottomNavProps) {
    return (
        <>
            {/* Floating Create Button */}
            {onCreateClick && (
                <button
                    onClick={onCreateClick}
                    className="fixed bottom-20 right-4 z-50 w-14 h-14 btn rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all"
                    aria-label="Novo lead"
                >
                    <Plus size={28} />
                </button>
            )}

            {/* Nav Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-s1 border-t border-app safe-area-bottom z-50">
                <div className="flex justify-around items-center h-16">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        const showBadge = tab.id === 'finalizadas' && finishedCount && finishedCount > 0
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`
                                    flex flex-col items-center justify-center flex-1 h-full relative
                                    transition-colors
                                    ${isActive
                                        ? 'text-primary'
                                        : 'text-muted hover:text-app'}
                                `}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <span className={`relative ${isActive ? 'scale-110 transition-transform' : ''}`}>
                                    {tab.icon}
                                    {showBadge && (
                                        <span className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                            {finishedCount > 9 ? '9+' : finishedCount}
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
