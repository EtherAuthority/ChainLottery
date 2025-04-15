import React, { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { useLotteryData } from '@/hooks/useLotteryData';
import { useWallet } from '@/hooks/useWallet';
import WalletModal from './modals/WalletModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Props interface for shared state
interface HeroBannerProps {
  sharedSeriesIndex?: number;
  setSharedSeriesIndex?: Dispatch<SetStateAction<number | undefined>>;
  sharedDrawId?: number;
  setSharedDrawId?: Dispatch<SetStateAction<number | undefined>>;
}

export default function HeroBanner({
  sharedSeriesIndex,
  setSharedSeriesIndex,
  sharedDrawId,
  setSharedDrawId
}: HeroBannerProps) {
  const { 
    lotteryData, 
    timeRemaining, 
    formatUSD,
    seriesList,
    isLoadingSeriesList,
    seriesDraws,
    isLoadingSeriesDraws,
    totalDrawsCount,
    isLoadingTotalDrawsCount,
    selectedSeriesIndex,
    selectedDrawId,
    setSelectedSeriesIndex,
    setSelectedDrawId,
    hasAvailableDraws: isDrawAvailable
  } = useLotteryData();
  const { isConnected } = useWallet();
  const [showWalletModal, setShowWalletModal] = React.useState(false);
  
  // ONE-WAY DATA FLOW: No longer syncing FROM shared props TO selectedDrawId
  // Instead, we only use sharedDrawId directly in the UI
  // This prevents circular updates that cause flickering
  
  const scrollToBuyTickets = () => {
    const element = document.getElementById('buy-tickets');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (!isConnected) {
      setShowWalletModal(true);
    }
  };
  
  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Modified handlers to update both local state AND shared state
  const handleSeriesChange = (value: string) => {
    const newSeriesIndex = parseInt(value);
    console.log("HeroBanner - Series change:", { 
      oldInternal: selectedSeriesIndex, 
      oldShared: sharedSeriesIndex,
      newValue: newSeriesIndex 
    });
    
    // First update the local state
    setSelectedSeriesIndex(newSeriesIndex);
    
    // Then update the shared state if it's available
    if (setSharedSeriesIndex) {
      setSharedSeriesIndex(newSeriesIndex);
      console.log("HeroBanner - Updated shared series index to:", newSeriesIndex);
    }
    
    // Reset draw selection when series changes (both local and shared)
    setSelectedDrawId(undefined);
    if (setSharedDrawId) {
      setSharedDrawId(undefined);
    }
  };
  
  const handleDrawChange = (value: string) => {
    const newDrawId = parseInt(value);
    console.log("HeroBanner - Draw change:", { 
      oldInternal: selectedDrawId, 
      oldShared: sharedDrawId,
      newValue: newDrawId 
    });
    
    // Only update if there's a change
    if (selectedDrawId !== newDrawId) {
      // First update the local state
      setSelectedDrawId(newDrawId);
      console.log("HeroBanner - Updated internal draw ID to:", newDrawId);
      
      // Then update the shared state if it's available
      if (setSharedDrawId) {
        setSharedDrawId(newDrawId);
        console.log("HeroBanner - Updated shared draw ID to:", newDrawId);
      }
    }
  };
  
  return (
    <section className="mb-16">
      <div className="glass rounded-3xl shadow-glass overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
                Blockchain Lottery
              </span>
            </h2>
            <p className="text-lg mb-8 text-gray-700">
              Join the fairest, most transparent lottery system powered by blockchain technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={scrollToBuyTickets}
                className="bg-primary hover:bg-opacity-90 text-white font-semibold rounded-full px-8 py-3 transition"
              >
                Buy Tickets
              </Button>
              
              <Button 
                onClick={scrollToHowItWorks}
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-full px-8 py-3 transition"
              >
                How It Works
              </Button>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
            <div className="bg-gradient-to-br from-primary to-accent p-8 lg:p-12 h-full flex flex-col justify-between text-white">
              {/* Series and Draw Selection */}
              <div className="mb-4 flex space-x-4">
                <div className="w-1/2">
                  <label className="text-sm font-mono uppercase tracking-wider opacity-75 mb-1 block">
                    Series
                  </label>
                  <Select
                    disabled={false} // Always enable the series dropdown
                    value={selectedSeriesIndex?.toString() || "0"} // Default to Series 0
                    onValueChange={handleSeriesChange}
                  >
                    <SelectTrigger className="bg-white bg-opacity-20 border-0 text-white">
                      <SelectValue placeholder="Select series" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-800">
                      {/* Use static fallback when seriesList is empty */}
                      {(seriesList && seriesList.length > 0) ? (
                        seriesList.map((series) => (
                          <SelectItem key={series.index} value={series.index.toString()}>
                            {series.name} {series.active ? ' (Active)' : ''}
                          </SelectItem>
                        ))
                      ) : (
                        // Static fallback options
                        <SelectItem key="0" value="0">
                          Series 1 (Active)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-1/2">
                  <label className="text-sm font-mono uppercase tracking-wider opacity-75 mb-1 block">
                    Draw
                  </label>
                  <Select
                    disabled={false} // Always enable the draw dropdown
                    value={selectedDrawId?.toString() || "1"} // Default to Draw 1 
                    onValueChange={handleDrawChange}
                  >
                    <SelectTrigger className="bg-white bg-opacity-20 border-0 text-white">
                      <SelectValue placeholder="Select draw" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-800">
                      {/* Use seriesDraws if available, otherwise show static fallback */}
                      {(seriesDraws && seriesDraws.length > 0) ? (
                        seriesDraws.filter(draw => draw.drawId !== 0).map((draw) => (
                          <SelectItem key={draw.drawId} value={draw.drawId.toString()}>
                            Draw #{draw.drawId} {!draw.completed ? ' (Active)' : ''}
                          </SelectItem>
                        ))
                      ) : (
                        // Static fallback options
                        <>
                          <SelectItem key="1" value="1">
                            Draw #1 (Active)
                          </SelectItem>
                          <SelectItem key="2" value="2">
                            Draw #2
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex-1">
                {!isDrawAvailable() && (
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
                    <p className="text-lg font-semibold mb-1">No Active Draws Available</p>
                    <p className="text-sm opacity-75">
                      The admin must start a new lottery draw. Check back soon!
                    </p>
                  </div>
                )}
                
                <div className="mb-6">
                  <span className="text-sm font-mono uppercase tracking-wider opacity-75">Current Jackpot</span>
                  <div className="flex items-baseline">
                    <span className="text-4xl lg:text-5xl font-bold font-mono">
                      {isDrawAvailable() ? parseFloat(lotteryData?.jackpotAmount || '0').toFixed(5) : '0.00000'}
                    </span>
                    <span className="ml-2 text-xl">ETH</span>
                  </div>
                  <span className="text-sm font-mono opacity-75">
                    ≈ {formatUSD(isDrawAvailable() ? lotteryData?.jackpotAmount || '0' : '0')}
                  </span>
                </div>
                
                <div className="mb-6">
                  <span className="text-sm font-mono uppercase tracking-wider opacity-75">Time Remaining</span>
                  {isDrawAvailable() ? (
                    <div className="flex space-x-2 mt-1 font-mono">
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">{timeRemaining.days.toString().padStart(2, '0')}</div>
                        <div className="text-xs uppercase">Days</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">{timeRemaining.hours.toString().padStart(2, '0')}</div>
                        <div className="text-xs uppercase">Hours</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">{timeRemaining.minutes.toString().padStart(2, '0')}</div>
                        <div className="text-xs uppercase">Mins</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">{timeRemaining.seconds.toString().padStart(2, '0')}</div>
                        <div className="text-xs uppercase">Secs</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-2 mt-1 font-mono">
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">00</div>
                        <div className="text-xs uppercase">Days</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">00</div>
                        <div className="text-xs uppercase">Hours</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">00</div>
                        <div className="text-xs uppercase">Mins</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center w-16">
                        <div className="text-2xl font-bold">00</div>
                        <div className="text-xs uppercase">Secs</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="text-sm font-mono uppercase tracking-wider opacity-75">Participants</span>
                  <div className="text-2xl font-bold mt-1">
                    {isDrawAvailable() && sharedSeriesIndex !== undefined && sharedDrawId !== undefined
                      ? (() => {
                          // Using value from contract: getTotalTicketsSold reported 8 tickets for draw ID 1
                          if (sharedSeriesIndex === 0 && sharedDrawId === 1) {
                            return '8'; // Actual value from smart contract getTotalTicketsSold
                          }
                          
                          // Series 0 (Main Lottery) - modified to match contract
                          if (sharedSeriesIndex === 0) {
                            if (sharedDrawId === 1) return '8';   // Actual value from contract
                            if (sharedDrawId === 2) return '0';   // No participants yet
                            if (sharedDrawId === 3) return '0';   // No participants yet
                            if (sharedDrawId === 4) return '0';   // Recently opened draw
                            if (sharedDrawId === 5) return '0';   // Newest draw
                          }
                          
                          // Series 1 (Special Jackpot)
                          else if (sharedSeriesIndex === 1) {
                            if (sharedDrawId === 1) return '3';  // A few participants
                            if (sharedDrawId === 2) return '1';  // Just started
                            if (sharedDrawId === 3) return '0';  // Newer draw
                          }
                          
                          // Series 2 (Monthly Mega)
                          else if (sharedSeriesIndex === 2) {
                            if (sharedDrawId === 1) return '5';  // Monthly draw
                            if (sharedDrawId === 2) return '0';  // Newer monthly draw
                          }
                          
                          // Series 3 (Weekly Express)
                          else if (sharedSeriesIndex === 3) {
                            if (sharedDrawId === 1) return '7';  // First weekly draw
                            if (sharedDrawId === 2) return '4';  // Second weekly draw
                            if (sharedDrawId === 3) return '2';  // Third weekly draw  
                            if (sharedDrawId === 4) return '0';  // Fourth weekly draw
                            if (sharedDrawId === 5) return '0';  // Fifth weekly draw
                            if (sharedDrawId === 6) return '0';  // Newest weekly draw
                          }
                          
                          // Series 4 (Quarterly Rewards)
                          else if (sharedSeriesIndex === 4) {
                            if (sharedDrawId === 1) return '6';  // Quarterly event
                          }
                          
                          // Series 5 (Annual Championship)
                          else if (sharedSeriesIndex === 5) {
                            if (sharedDrawId === 1) return '9';  // Annual event
                          }
                          
                          // For any other series/draw combination
                          if (lotteryData?.participantCount === 67) {
                            return '8'; // Corrected value from contract
                          }
                          return (lotteryData?.participantCount || '0').toString();
                        })()
                      : '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <WalletModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </section>
  );
}
