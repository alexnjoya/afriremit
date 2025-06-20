import React, { useState, useRef, useEffect } from 'react';
import { createThirdwebClient } from 'thirdweb';
import { ConnectButton } from 'thirdweb/react';

import {
  Shield,
  LayoutDashboard,
  Send,
  ArrowLeftRight,
  PiggyBank,
  Users,
  Menu,
  X,
  Droplets,
  Settings,
  Wallet,
  Bell,
  Gift,
  ArrowDownLeft,
  DollarSignIcon,
  Home,
  LogOut,
  Zap,
  AlertTriangle,
  MoreHorizontal,
  ChevronDown,
  MessageCircle,
  ArrowUpRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useContractInstances } from '@/provider/ContractInstanceProvider';
import { Link } from 'react-router-dom';
import AIChatModal from '../components/AI/Chat';
import tokens from '@/lib/Tokens/tokens';
import { formatEther, JsonRpcProvider } from 'ethers';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout = ({ children, currentPage, onPageChange }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  const { 
    isConnected, 
    address, 
    isCorrectNetwork,
    networkError,
    connectionError,
    signer,
    TEST_TOKEN_CONTRACT_INSTANCE,
    AFRISTABLE_CONTRACT_INSTANCE
  } = useContractInstances();

  // Create Thirdweb client
  const client = createThirdwebClient({ 
    clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID
  });

  // Primary navigation items (always visible on desktop)
  const primaryNavigation = [
    { name: 'Dashboard', key: 'dashboard', icon: Home },
    { name: 'Send', key: 'send', icon: Send },
    { name: 'Swap', key: 'swap', icon: ArrowLeftRight },
    { name: 'Save', key: 'savings', icon: PiggyBank },
    { name: 'Buy/Sell', key: 'Buy/Sell', icon: DollarSignIcon },
  ];

  // Secondary navigation items (in "More" dropdown on desktop, full list on mobile)
  const secondaryNavigation = [
    { name: 'Faucet', key: 'faucet', icon: Droplets },
    { name: 'Utility Pay', key: 'utility', icon: Zap },
    { name: 'Admin', key: 'admin', icon: Shield },
  ];

  // All navigation items for mobile
  const allNavigation = [...primaryNavigation, ...secondaryNavigation];

  const [txNotifications, setTxNotifications] = useState<any[]>([]);
  const [txNotifBadge, setTxNotifBadge] = useState(false);

  // Fetch recent transactions for notifications
  useEffect(() => {
    const fetchTxNotifs = async () => {
      if (!isConnected || !address || !signer) {
        setTxNotifications([]);
        setTxNotifBadge(false);
        return;
      }
      const provider = signer.provider as JsonRpcProvider | undefined;
      if (!provider) return;
      try {
        const fetchTokenTxs = async (token: any) => {
          if (!token.address) return [];
          let contract;
          if (token.symbol === 'AFX') {
            contract = await AFRISTABLE_CONTRACT_INSTANCE();
          } else {
            contract = await TEST_TOKEN_CONTRACT_INSTANCE(token.address);
          }
          if (!contract) return [];
          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(currentBlock - 10000, 0);
          const sentEvents = await contract.queryFilter(
            contract.filters.Transfer(address, null),
            fromBlock,
            currentBlock
          );
          const receivedEvents = await contract.queryFilter(
            contract.filters.Transfer(null, address),
            fromBlock,
            currentBlock
          );
          const sent = sentEvents.map(e => ({
            hash: e.transactionHash,
            blockNumber: e.blockNumber,
            direction: 'sent',
            counterparty: e.args?.to,
            amount: parseFloat(formatEther(e.args?.value)),
            token: token.symbol,
            timestamp: null
          }));
          const received = receivedEvents.map(e => ({
            hash: e.transactionHash,
            blockNumber: e.blockNumber,
            direction: 'received',
            counterparty: e.args?.from,
            amount: parseFloat(formatEther(e.args?.value)),
            token: token.symbol,
            timestamp: null
          }));
          return [...sent, ...received];
        };
        const txArrays = await Promise.all(tokens.filter(t => t.address).map(fetchTokenTxs));
        let txs = txArrays.flat();
        // Fetch timestamps for each unique block
        const blockNumbers = Array.from(new Set(txs.map(tx => tx.blockNumber)));
        const blockTimestamps: Record<number, number> = {};
        if (provider && typeof provider.getBlock === 'function') {
          await Promise.all(blockNumbers.map(async (bn) => {
            const block = await provider.getBlock(bn);
            blockTimestamps[bn] = block?.timestamp;
          }));
        }
        txs = txs.map(tx => ({ ...tx, timestamp: blockTimestamps[tx.blockNumber] }));
        txs.sort((a, b) => b.blockNumber - a.blockNumber);
        setTxNotifications(txs.slice(0, 3));
        setTxNotifBadge(txs.length > 0);
      } catch (err) {
        setTxNotifications([]);
        setTxNotifBadge(false);
      }
    };
    fetchTxNotifs();
    // Poll every 15s
    const interval = setInterval(fetchTxNotifs, 15000);
    return () => clearInterval(interval);
  }, [isConnected, address, signer, TEST_TOKEN_CONTRACT_INSTANCE, AFRISTABLE_CONTRACT_INSTANCE]);

  // Hide badge when dropdown is opened
  useEffect(() => {
    if (showNotifications) setTxNotifBadge(false);
  }, [showNotifications]);

  // Format address for display
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const isCurrentPageInSecondary = secondaryNavigation.some(item => item.key === currentPage);

  // Add click outside handler for More menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 max-w-7xl mx-auto">
      {/* Top Navbar */}
      <div className="bg-white border-b border-stone-200 h-16 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between h-full px-4 lg:px-8 max-w-7xl mx-auto">

          {/* Logo */}
          <div className="flex items-center curser-pointer space-x-3 group">
            <button 
              onClick={() => onPageChange('dashboard')} 
              className="flex items-center space-x-3"
            >  
              <div className="relative">
                <img 
                  src="https://res.cloudinary.com/ecosheane/image/upload/v1749952368/logo_virjcs.jpg"
                  alt="AfriRemit Logo"
                  className="w-12 h-12 rounded-xl object-cover group-hover:shadow-orange-200 transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute -inset-1 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  AfriRemit
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation - Optimized */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* Primary Navigation Items */}
            {primaryNavigation.map((item) => (
              <button
                key={item.key}
                onClick={() => onPageChange(item.key)}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap',
                  currentPage === item.key
                    ? 'bg-terracotta text-white shadow-sm'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-terracotta'
                )}
              >
                <item.icon className="w-4 h-4" />
              
              </button>
            ))}

            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
                  isCurrentPageInSecondary
                    ? 'bg-terracotta text-white shadow-sm'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-terracotta'
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden lg:inline">More</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* More Dropdown Menu */}
              {showMoreMenu && (
                <div 
                  ref={moreMenuRef}
                  className="absolute z-50 top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-1"
                >
                  {secondaryNavigation.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        onPageChange(item.key);
                         setShowMoreMenu(false); // Keep this line
                        
                      }}
                      className={cn(
                        'flex items-center space-x-3 w-full px-4 py-2 text-left text-sm transition-colors',
                        currentPage === item.key
                          ? 'bg-terracotta text-white'
                          : 'text-stone-700 hover:bg-stone-50'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right side - Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-stone-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-stone-700" />
            </button>
          </div>

          {/* Right side icons - Desktop */}
          <div className="hidden lg:flex items-center space-x-2">
            {/* AI Chat Button */}
            <button 
              onClick={() => setShowAIChat(true)}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors relative group"
              title="AI Assistant"
            >
              <MessageCircle className="w-5 h-5 text-stone-700 group-hover:text-terracotta transition-colors" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-terracotta to-sage rounded-full animate-pulse"></div>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={handleNotificationClick}
                className="p-2 rounded-lg hover:bg-stone-100 transition-colors relative"
              >
                <Bell className="w-5 h-5 text-stone-700" />
                {txNotifBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-stone-200 z-50">
                  <div className="p-4 border-b border-stone-200">
                    <h3 className="font-semibold text-stone-800">Recent Transactions</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {txNotifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">No recent transactions</div>
                    ) : (
                      txNotifications.map((tx, idx) => (
                        <div key={tx.hash + idx} className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 m-2 shadow-sm">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.direction === 'sent' ? 'bg-orange-100' : 'bg-emerald-100'}`}> 
                            {tx.direction === 'sent' ? <ArrowUpRight className="w-5 h-5 text-orange-500" /> : <ArrowDownLeft className="w-5 h-5 text-emerald-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800 text-sm">{tx.direction === 'sent' ? 'Sent' : 'Received'} {tx.amount} {tx.token}</div>
                            <div className="text-xs text-slate-500">{tx.direction === 'sent' ? 'To' : 'From'} {tx.counterparty?.slice ? tx.counterparty.slice(0, 6) + '...' + tx.counterparty.slice(-4) : ''}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}</div>
                            <div className="text-[11px] text-slate-400">{tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : ''}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 text-center border-t border-stone-200">
                    <button className="text-terracotta text-sm font-medium hover:text-terracotta/80">
                      View All Transactions
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thirdweb Connect Button */}
            <ConnectButton 
              client={client}
              connectButton={{
                label: "Connect",
                className: "!bg-gradient-to-r !from-terracotta !to-sage !text-white !font-medium !px-4 !py-2 !rounded-lg !transition-all !duration-200 hover:!shadow-lg !text-sm"
              }}
              detailsButton={{
                className: "!bg-green-600 !text-white !font-medium !px-4 !py-2 !rounded-lg !transition-all !duration-200 !text-sm",
                displayBalanceToken: {
                  4202: "0x0000000000000000000000000000000000000000"
                }
              }}
              connectModal={{
                title: "Connect to AfriRemit",
                titleIcon: "https://your-logo-url.com/logo.png",
                showThirdwebBranding: false,
              }}
              switchButton={{
                label: "Switch Network"
              }}
            />
          </div>
        </div>
      </div>

      {/* Network Error Banner */}
      {(networkError || connectionError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 fixed top-16 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800">
                {networkError || connectionError}
              </span>
            </div>
            {networkError && (
              <span className="text-sm text-red-600 font-medium">
                Use the wallet button to switch networks
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      <div className="lg:hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-terracotta to-sage rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-xs">A</span>
                    </div>
                    <span className="font-bold text-xl bg-gradient-to-r from-terracotta to-sage bg-clip-text text-transparent">
                      AfriRemit
                    </span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X className="w-6 h-6 text-stone-700" />
                  </button>
                </div>
                
                {/* Mobile Navigation */}
                <div className="flex-1 overflow-y-auto py-4">
                  <nav className="px-4 space-y-2">
                    {allNavigation.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          onPageChange(item.key);
                          setSidebarOpen(false);
                        }}
                        className={cn(
                          'flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors text-left',
                          currentPage === item.key
                            ? 'bg-terracotta text-white'
                            : 'text-stone-700 hover:bg-stone-100'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </nav>
                  
                  {/* Mobile additional options */}
                  <div className="mt-6 px-4 space-y-2 border-t border-stone-200 pt-4">
                    <button 
                      onClick={() => {
                        setShowAIChat(true);
                        setSidebarOpen(false);
                      }}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-stone-700 hover:bg-stone-100 rounded-lg"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>AfriRemit AI</span>
                      <span className="ml-auto w-2 h-2 bg-gradient-to-r from-terracotta to-sage rounded-full animate-pulse"></span>
                    </button>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-stone-700 hover:bg-stone-100 rounded-lg"
                    >
                      <Bell className="w-5 h-5" />
                      <span>Notifications</span>
                      <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                  </div>
                </div>
                
                {/* Mobile Footer */}
                <div className="p-4 border-t border-stone-200">
                  {/* Mobile Thirdweb Connect Button */}
                  <ConnectButton 
                    client={client}
                    connectButton={{
                      label: "Connect Wallet",
                      className: "!w-full !bg-gradient-to-r !from-terracotta !to-sage !text-white !font-medium !px-4 !py-3 !rounded-lg"
                    }}
                    detailsButton={{
                      className: "!w-full !bg-green-600 !text-white !font-medium !px-4 !py-3 !rounded-lg",
                      displayBalanceToken: {
                        4202: "0x0000000000000000000000000000000000000000"
                      }
                    }}
                    connectModal={{
                      title: "Connect to AfriRemit",
                      showThirdwebBranding: false,
                    }}
                    switchButton={{
                      label: "Switch to Lisk Sepolia"
                    }}
                  />
                  
                  {/* Connection Status Indicator */}
                  {isConnected && (
                    <div className="mt-3 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">Connected</span>
                      </div>
                      {address && (
                        <p className="text-xs text-green-600 mt-1 font-mono">
                          {formatAddress(address)}
                        </p>
                      )}
                      {!isCorrectNetwork && (
                        <div className="flex items-center space-x-2 mt-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-orange-600">Wrong Network</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay to close dropdowns */}
      {showNotifications && (
  <div 
    className="fixed inset-0 z-40" 
    onClick={() => setShowNotifications(false)}
  />
)}

      {/* AI Chat Modal */}
      {showAIChat && (
        <AIChatModal 
          isOpen={showAIChat} 
          onClose={() => setShowAIChat(false)} 
        />
      )}

      {/* Main Content */}
      <div className={`pt-16 ${(networkError || connectionError) ? 'pt-28' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;