import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useWallet } from '@/hooks/useWallet';
import { useAdmin } from '@/hooks/useAdmin';
import { formatAddress } from '@/lib/web3';
import { getLotteryContract } from '@/lib/lotteryContract';
import { useToast } from '@/hooks/use-toast';
import WalletModal from './modals/WalletModal';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Wallet, Menu, X, ShieldCheck } from 'lucide-react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { isConnected, account, disconnect, provider } = useWallet();
  const { isAdmin } = useAdmin();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Function to handle clicking on the admin link - simplest direct check
  const handleAdminClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default navigation
    
    // DIRECT CHECK 1: Is wallet connected?
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to access admin features.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    // DIRECT CHECK 2: Is it the admin wallet?
    try {
      if (!provider || !account) {
        toast({
          title: "Wallet Error",
          description: "Error accessing wallet. Please try again.",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      // Get network and contract information
      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();
      const contract = getLotteryContract(provider, chainId);
      
      if (!contract) {
        toast({
          title: "Contract Error",
          description: "Could not access lottery contract. Please ensure you're on the correct network.",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      // Get admin address directly from contract
      const adminAddress = await contract.admin();
      const isCurrentAdmin = adminAddress.toLowerCase() === account.toLowerCase();
      
      if (!isCurrentAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges. Please connect with the admin wallet.",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      // Admin access granted, navigate to admin page
      console.log("Admin access granted, proceeding to admin page");
      setLocation("/admin");
    } catch (error) {
      console.error("Error verifying admin access:", error);
      toast({
        title: "Error",
        description: "Error checking admin status. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };
  
  const toggleMobileMenu = () => {
    setIsOpen(!isOpen);
  };

  // Custom link component to avoid nesting <a> tags
  const NavLink = ({ href, label, isMobile = false }: { href: string, label: string | React.ReactNode, isMobile?: boolean }) => {
    return (
      <Link href={href}>
        {isMobile ? (
          <span className="block px-3 py-2 text-white hover:bg-white hover:bg-opacity-10 rounded-md cursor-pointer">
            {label}
          </span>
        ) : (
          <span className={`text-white hover:text-accent transition cursor-pointer ${location === href ? 'text-accent' : ''}`}>
            {label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 glass-dark shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <svg 
                className="h-10 w-10 mr-3 rounded-full"
                viewBox="0 0 40 40" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="20" cy="20" r="20" fill="#6C63FF" />
                <path d="M12 20L20 12L28 20L20 28L12 20Z" fill="white" />
                <path d="M16 20L20 16L24 20L20 24L16 20Z" fill="#2D3748" />
              </svg>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
                CryptoLotto
              </h1>
            </div>
          </Link>
        </div>
        
        {/* Mobile menu button */}
        <button 
          type="button" 
          className="lg:hidden text-white focus:outline-none"
          onClick={toggleMobileMenu}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          <NavLink href="/" label="Home" />
          <NavLink href="/tickets" label="My Tickets" />
          <NavLink href="/history" label="History" />
          <NavLink href="/faq" label="FAQ" />
          <Link href="/admin" onClick={handleAdminClick}>
            <div 
              className={`text-white hover:text-accent transition cursor-pointer ${location === '/admin' ? 'text-accent' : ''}`}
            >
              <span className="flex items-center">
                <ShieldCheck className="mr-1 h-4 w-4" />
                Admin
              </span>
            </div>
          </Link>
        </nav>
        
        {/* Wallet Connection */}
        <div className="hidden lg:block">
          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="glass rounded-full px-4 py-2 text-white border-none">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="truncate-address font-mono text-sm">
                    {account ? formatAddress(account) : ''}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/tickets">
                    <span className="w-full cursor-pointer">My Tickets</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" onClick={handleAdminClick}>
                        <span className="w-full flex items-center">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Admin Panel
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={disconnect} className="cursor-pointer">
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={() => setShowWalletModal(true)} 
              className="bg-primary hover:bg-opacity-90 text-white font-semibold rounded-full px-6 py-2 transition flex items-center"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-4 space-y-1 glass-dark">
            <NavLink href="/" label="Home" isMobile />
            <NavLink href="/tickets" label="My Tickets" isMobile />
            <NavLink href="/history" label="History" isMobile />
            <NavLink href="/faq" label="FAQ" isMobile />
            <Link href="/admin" onClick={handleAdminClick}>
              <div 
                className="block px-3 py-2 text-white hover:bg-white hover:bg-opacity-10 rounded-md cursor-pointer"
              >
                <span className="flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Panel
                </span>
              </div>
            </Link>
            
            {/* Mobile wallet connection */}
            {isConnected ? (
              <div className="mt-2 px-3 py-2">
                <div className="flex items-center justify-between text-white mb-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="font-mono text-sm">{account ? formatAddress(account) : ''}</span>
                  </div>
                </div>
                <Button 
                  onClick={disconnect} 
                  variant="outline"
                  className="w-full border-white text-white hover:bg-white hover:bg-opacity-10"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setShowWalletModal(true)} 
                className="w-full mt-2 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-full px-6 py-2 transition flex items-center justify-center"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      )}
      
      <WalletModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </header>
  );
}
