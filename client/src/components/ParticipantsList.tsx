import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';
import { getLotteryContract, getDrawParticipants, Participant } from '@/lib/lotteryContract';
import { useWallet } from '@/hooks/useWallet';
import { getLotteryAddress } from '@shared/contracts';
import { lotteryABI } from '@shared/lotteryABI';
import { 
  RefreshCcw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper function to format timestamp into readable date
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  
  // Use Intl.DateTimeFormat for localized formatting
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return formatter.format(date);
};

interface ParticipantsListProps {
  sharedSeriesIndex?: number;
  sharedDrawId?: number;
}

interface Ticket {
  walletAddress: string;
  numbers: number[];
  lottoNumber: number | null;
  timestamp: number;
  ticketId: string;
}

interface ContractData {
  participants: Participant[];
  counts: { [key: string]: number };
}

export default function ParticipantsList({ sharedSeriesIndex, sharedDrawId }: ParticipantsListProps) {
  const { provider, chainId } = useWallet();
  
  // State for storing previous value to detect changes
  const [previousSeriesIndex, setPreviousSeriesIndex] = useState<number | undefined>(undefined);
  const [previousDrawId, setPreviousDrawId] = useState<number | undefined>(undefined);
  
  // Create a local fallback draw ID map to ensure we always have a valid draw ID for each series
  const getDefaultDrawIdForSeries = useCallback((seriesIndex?: number): number => {
    if (seriesIndex === undefined) return 1; // Default to draw 1
    
    // Map series indices to their respective draw IDs (direct mapping from contract)
    switch (seriesIndex) {
      case 0: return 1; // Beginner Series
      case 1: return 2; // Intermediate Series
      case 2: return 3; // Monthly Mega
      case 3: return 4; // Weekly Express
      case 4: return 5; // Quarterly
      case 5: return 6; // Annual
      default: return 1;
    }
  }, []);
  
  // Compute effective draw ID that will never be undefined
  const effectiveDrawId = sharedDrawId !== undefined ? sharedDrawId : getDefaultDrawIdForSeries(sharedSeriesIndex);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  // Default to false - we'll only set to true if we can confirm data exists in the contract
  const [isContractDataAvailable, setIsContractDataAvailable] = useState(false);

  // Custom contract read implementation using React Query
  const { data: contractData, error, isLoading, refetch: refetchParticipants } = useQuery<ContractData>({
    queryKey: ['drawParticipants', chainId, sharedSeriesIndex, effectiveDrawId],
    queryFn: async () => {
      let usedProvider: ethers.Provider | null = provider;
      let usedChainId = chainId;
      if (!usedProvider) {
        usedProvider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/9112e69058b4492c85a2d630b5d371c0");
        usedChainId = "11155111"; // Sepolia chainId as string
      }
      if (!usedChainId || sharedSeriesIndex === undefined) {
        return { participants: [], counts: {} };
      }
      const result = await getDrawParticipants(usedProvider, usedChainId, effectiveDrawId, sharedSeriesIndex);
      return {
        participants: result.participants.map(p => ({
          ...p,
          ticketId: p.ticketId || `${effectiveDrawId}-${p.walletAddress}`
        })),
        counts: result.counts
      };
    },
    enabled: true, // Always enabled to fetch data without wallet connection
    staleTime: 60000, // Increase stale time to 1 minute
    refetchOnMount: false, // Disable refetch on mount
    refetchOnWindowFocus: false, // Disable refetch on window focus
    retry: 1, // Reduce retry attempts
    retryDelay: 1000 // Fixed retry delay
  });
  
  // Manual refresh function for the refresh button
  const handleManualRefresh = useCallback(() => {
    console.log(`🔄 ParticipantsList - Manual refresh triggered for Series ${sharedSeriesIndex}, Draw ${effectiveDrawId}`);
    refetchParticipants();
  }, [refetchParticipants, sharedSeriesIndex, effectiveDrawId]);
  
  // Reset to page 1 when series or draw changes and directly query the smart contract
  useEffect(() => {
    // Guard against undefined series index only (we always have effectiveDrawId)
    if (sharedSeriesIndex === undefined) {
      console.log("⚠️ ParticipantsList - Skipping effect due to undefined series");
      return;
    }
    
    // Reset to first page with any props update
    setCurrentPage(1);
    
    // Log the update for debugging
    console.log(`ParticipantsList - Props updated to series: ${sharedSeriesIndex}, effectiveDrawId: ${effectiveDrawId}`);
    
    // Always query directly from the smart contract - no local storage involved
    console.log(`🔄 ParticipantsList - Directly querying blockchain for Series ${sharedSeriesIndex}, Draw ${effectiveDrawId}`);
    refetchParticipants();
    
  }, [sharedSeriesIndex, effectiveDrawId, refetchParticipants]);
  
  // Get title based on series index
  const getSeriesTitle = () => {
    // If contract data is not available, return a generic title
    if (!isContractDataAvailable) {
      return "Lottery";
    }
    
    switch(sharedSeriesIndex) {
      case 0: return "Beginner Series";
      case 1: return "Intermediate Series";
      case 2: return "Monthly Mega Series";
      case 3: return "Weekly Express Series";
      case 4: return "Quarterly Rewards Series";
      case 5: return "Annual Championship Series";
      default: return "Lottery";
    }
  };
  
  // Get ticket price based on series
  const getTicketPrice = () => {
    switch(sharedSeriesIndex) {
      case 0: return "0.0001";
      case 1: return "0.0002";
      case 2: return "0.0005";
      case 3: return "0.0001";
      case 4: return "0.0008";
      case 5: return "0.001";
      default: return "0.0001";
    }
  };
  
  // No synthetic winner determination - only contract-verified winners should be displayed
  const isTicketWinner = (_ticketId: string): boolean => {
    return false; // No winners displayed unless they come directly from the contract
  };
  
  // Process participants data
  const processParticipants = (data: ContractData) => {
    return data.participants.map((p: Participant) => ({
      ...p,
      numbers: (p.numbers || []).map((num: number, index: number) => ({
        value: num,
        position: index + 1
      }))
    }));
  };
  
  // Destructure data with fallbacks
  const participants = contractData?.participants || [];
  const participantCount = contractData?.counts[effectiveDrawId.toString()] || 0;
  
  // Show improved error state with casino styling
  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="casino-card p-6">
          <div className="casino-card-header flex justify-between items-center mb-6 -mx-6 -mt-6 px-6 py-4">
            <div className="text-sm uppercase tracking-widest font-bold text-primary">
              {getSeriesTitle()} Participants
            </div>
            <div className="flex items-center space-x-2">
              {!isContractDataAvailable ? (
                <span className="text-sm font-medium text-white/70"><span className="lotto-number">No Data</span></span>
              ) : (
                <span className="text-sm font-medium text-white/70">Draw ID <span className="lotto-number">{effectiveDrawId}</span></span>
              )}
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-yellow-500 text-transparent bg-clip-text">
              Error Loading Participants
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              className="flex items-center border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
          
          <Alert variant="destructive" className="mb-4 bg-black/50 border border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              {error instanceof Error ? error.message : "Failed to fetch participant data. Please try again."}
            </AlertDescription>
          </Alert>
          
          <p className="text-white/70 mt-4">
            The connection to the blockchain may be temporarily unavailable. This is normal and should resolve shortly.
          </p>
          <p className="text-white/70 mt-2">
            Click the "Retry" button above to attempt to reconnect.
          </p>
        </div>
      </section>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="casino-card p-6">
          <div className="casino-card-header flex justify-between items-center mb-6 -mx-6 -mt-6 px-6 py-4">
            <div className="text-sm uppercase tracking-widest font-bold text-primary">
              {getSeriesTitle()} Participants
            </div>
            <div className="flex items-center space-x-2">
              {!isContractDataAvailable ? (
                <span className="text-sm font-medium text-white/70"><span className="lotto-number">No Data</span></span>
              ) : (
                <span className="text-sm font-medium text-white/70">Draw ID <span className="lotto-number">{effectiveDrawId}</span></span>
              )}
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-500 text-transparent bg-clip-text">
              Loading Participants...
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              disabled={true}
              className="flex items-center border-primary/30 text-primary/50"
            >
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-white/70">
              Loading participant data from the blockchain...
            </p>
          </div>
        </div>
      </section>
    );
  }
  
  // Show empty state when no tickets are found
  if (!participants || participants.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="casino-card p-6">
          <div className="casino-card-header flex justify-between items-center mb-6 -mx-6 -mt-6 px-6 py-4">
            <div className="text-sm uppercase tracking-widest font-bold text-primary">
              {getSeriesTitle()} Participants
            </div>
            <div className="flex items-center space-x-2">
              {!isContractDataAvailable ? (
                <span className="text-sm font-medium text-white/70"><span className="lotto-number">No Data</span></span>
              ) : (
                <span className="text-sm font-medium text-white/70">Draw ID <span className="lotto-number">{effectiveDrawId}</span></span>
              )}
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-500 text-transparent bg-clip-text">
              Current Participants
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="flex items-center border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all"
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 mb-4">
              <AlertCircle className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-white/70 mt-2">
              {!isContractDataAvailable ? (
                <>No Data</>
              ) : sharedSeriesIndex !== undefined ? (
                <>No participants found</>
              ) : (
                "No participant data available."
              )}
            </p>
          </div>
        </div>
      </section>
    );
  }
  
  // If we reach here, we have participants data to display
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="casino-card p-6">
        <div className="casino-card-header flex justify-between items-center mb-6 -mx-6 -mt-6 px-6 py-4">
          <div className="text-sm uppercase tracking-widest font-bold text-primary">
            {getSeriesTitle()} Participants
          </div>
          <div className="flex items-center space-x-2">
            {!isContractDataAvailable ? (
              <span className="text-sm font-medium text-white/70"><span className="lotto-number">No Data</span></span>
            ) : (
              <span className="text-sm font-medium text-white/70">Draw ID <span className="lotto-number">{effectiveDrawId}</span></span>
            )}
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></span>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-500 text-transparent bg-clip-text">
            Recent Ticket Purchases
          </h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <p className="text-md mb-4 font-medium text-white/80">
          Currently showing <span className="lotto-number">{participants.length}</span> tickets from <span className="lotto-number">{new Set(participants.map(p => p.walletAddress)).size}</span> participants
        </p>
        
        {/* Display participant data here */}
        {participants.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {participants.map((ticket) => (
              <div key={ticket.ticketId} className="bg-black/30 backdrop-blur-sm border border-primary/30 rounded-lg p-4 transition-all hover:border-primary/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white/60">Ticket #{ticket.ticketId}</span>
                  <span className="text-sm text-white/60">{formatAddress(ticket.walletAddress)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(ticket.numbers || []).map((num, index) => (
                    <div key={index} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                      <span className="text-sm font-mono text-white">{num.toString().padStart(2, '0')}</span>
                    </div>
                  ))}
                </div>
                {ticket.lottoNumber !== undefined && (
                  <div className="text-sm text-white/60">
                    Lotto Number: {ticket.lottoNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/70 py-16 bg-black/20 border border-primary/10 rounded-lg">
            <p className="mb-2 text-lg">No participant data available for this draw</p>
            <p className="text-sm text-white/50">Be the first to buy a ticket!</p>
          </div>
        )}
      </div>
    </section>
  );
}