import React, { useState, useEffect } from 'react'; 
import { Head } from '@inertiajs/react'; 
import { Database, Cpu } from 'lucide-react'; 
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; 

// --- IMPORT KOMPONEN Halaman --- 
import TabMasterData from './MasterData/TabMasterData'; 
import TabDataTarikan from './Partials/TabDataTarikan'; 

// DITAMBAHKAN tiaraMasters PADA PROPS DESTRUCTURING
export default function DataManagementIndex({ rpmMasters, smartkeyMasters, tiaraMasters, filters }) { 
    const [activeTab, setActiveTab] = useState('master'); 

    // Sync Tab Utama dengan Query Parameter URL 
    useEffect(() => { 
        const params = new URLSearchParams(window.location.search); 
        const mainTabParam = params.get('main_tab'); 
        if (mainTabParam && ['master', 'engine'].includes(mainTabParam)) { 
            setActiveTab(mainTabParam); 
        } 
    }, []); 

    const handleTabChange = (tabId) => { 
        setActiveTab(tabId); 
        const newUrl = new URL(window.location.href); 
        newUrl.searchParams.set('main_tab', tabId); 
        window.history.replaceState({}, '', newUrl); 
    }; 

    const tabs = [ 
        { id: 'master', label: 'Master Data', icon: Database }, 
        { id: 'engine', label: 'Data Tarikan & Engine', icon: Cpu }, 
    ]; 

    return ( 
        <AuthenticatedLayout header="Data Management"> 
            <Head title="Data Management Engine" /> 
            <div className="space-y-6"> 
                {/* Switcher Tab Utama */} 
                <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl w-fit border border-slate-200 dark:border-slate-800 shadow-sm"> 
                    {tabs.map((tab) => { 
                        const isActive = activeTab === tab.id; 
                        const Icon = tab.icon; 

                        return ( 
                            <button 
                                key={tab.id} 
                                type="button" 
                                onClick={() => handleTabChange(tab.id)} 
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${ 
                                    isActive 
                                         ? 'bg-blue-600 text-white shadow-sm' 
                                         : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200' 
                                }`} 
                            > 
                                <Icon className="w-4 h-4" /> 
                                {tab.label} 
                            </button> 
                        ); 
                    })} 
                </div> 

                {/* Content Render Tab */} 
                <div className="transition-all duration-300"> 
                    {activeTab === 'master' && ( 
                        <TabMasterData 
                             rpmMasters={rpmMasters} 
                             smartkeyMasters={smartkeyMasters} 
                             tiaraMasters={tiaraMasters} /* PROPS DITERUSKAN KE TAB MASTER DATA */
                             filters={filters} 
                         /> 
                    )} 
                    {activeTab === 'engine' && <TabDataTarikan />} 
                </div> 
            </div> 
        </AuthenticatedLayout> 
    ); 
}