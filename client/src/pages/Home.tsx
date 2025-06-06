import React, { useState, useEffect } from 'react';
import HeroBanner from '@/components/HeroBanner';
import LotteryStats from '@/components/LotteryStats';
import BuyTickets from '@/components/BuyTickets';
import ParticipantsList from '@/components/ParticipantsList';
import PastWinners from '@/components/PastWinners';
import FAQSection from '@/components/FAQSection';
import { useLotteryData } from '@/hooks/useLotteryData';

export default function Home() {
  // Create state at the Home component level instead of using useLotteryData directly
  // This will be the single source of truth for all child components
  const [homeSeriesIndex, setHomeSeriesIndex] = useState<number | undefined>(0); // Default to series 0
  const [homeDrawId, setHomeDrawId] = useState<number | undefined>(1); // Default to draw 1
  
  // Custom setter for home series index that handles switching between series cleanly
  const handleHomeSeriesIndexChange: React.Dispatch<React.SetStateAction<number | undefined>> = (value) => {
    const newSeriesIndex = typeof value === 'function' ? value(homeSeriesIndex) : value;
    console.log("Home - Setting series index:", newSeriesIndex);
    
    // Set the correct default draw ID for each series based on contract structure
    let defaultDrawId = 1; // Default for most series
    
    if (newSeriesIndex === 0) { // Main Lottery Series
      defaultDrawId = 1;
    } else if (newSeriesIndex === 1) { // Intermediate Series
      defaultDrawId = 2; 
    } else if (newSeriesIndex === 2) { // Monthly Mega
      defaultDrawId = 3;
    } else if (newSeriesIndex === 3) { // Weekly Express
      defaultDrawId = 4;
    } else if (newSeriesIndex === 4) { // Quarterly Rewards
      defaultDrawId = 5;
    } else if (newSeriesIndex === 5) { // Annual Championship
      defaultDrawId = 6;
    }
    
    console.log(`Setting series ${newSeriesIndex} with draw ID ${defaultDrawId}`);
    
    // First update the series index
    setHomeSeriesIndex(newSeriesIndex);
    // Then update the draw ID
    setHomeDrawId(defaultDrawId);
    
    // Also update the lottery data state directly for consistency
    setLotteryDataSeriesIndex(newSeriesIndex);
    setLotteryDataDrawId(defaultDrawId);
    
    // Force a refresh to ensure all components re-render with the new values
    setRefreshTrigger(prev => prev + 1);
    
    // Force data refresh to query blockchain for the new series/draw
    console.log(`Forcing refresh for series ${newSeriesIndex}, draw ${defaultDrawId}`);
    refetchDrawParticipants();
  }
  
  // Force refresh state when parameters change to ensure UI updates correctly
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Set up API listener for debug mode draw selection
  useEffect(() => {
    const checkForDebugDrawSelection = async () => {
      try {
        // Check if there's a debug draw ID selection
        const response = await fetch('/api/debug/current-selection');
        if (response.ok) {
          const data = await response.json();
          if (data.drawId && data.drawId !== homeDrawId) {
            console.log("Debug API changed draw ID to:", data.drawId);
            setHomeDrawId(data.drawId);
          }
        }
      } catch (error) {
        // Silently ignore errors as this is just a debug feature
      }
    };
    
    // Check once on component mount
    checkForDebugDrawSelection();
    
    // Check periodically for changes
    const interval = setInterval(checkForDebugDrawSelection, 5000);
    return () => clearInterval(interval);
  }, [homeDrawId]);
  
  // Get lottery data access to initialize our state
  const {
    seriesList,
    selectedSeriesIndex,
    setSelectedSeriesIndex: setLotteryDataSeriesIndex,
    selectedDrawId,
    setSelectedDrawId: setLotteryDataDrawId,
    refetchDrawParticipants,
    // Other lottery data props will be re-fetched in child components
  } = useLotteryData();

  // IMPORTANT: Only allow ONE direction of synchronization to prevent circular updates
  // We make Home.tsx the source of truth, and only push changes from Home → useLotteryData
  // This creates a clear, one-way data flow to prevent flickering
  
  // When our home state changes, update the lottery data state
  useEffect(() => {
    const updates = [];
    
    // Only update if the values are different and not undefined
    if (homeSeriesIndex !== undefined && homeSeriesIndex !== selectedSeriesIndex) {
      console.log("Home - Updating lottery data series index from home:", { 
        from: selectedSeriesIndex, 
        to: homeSeriesIndex 
      });
      setLotteryDataSeriesIndex(homeSeriesIndex);
      updates.push('series');
    }
    
    if (homeDrawId !== undefined && homeDrawId !== selectedDrawId) {
      console.log("Home - Updating lottery data draw ID from home:", { 
        from: selectedDrawId, 
        to: homeDrawId 
      });
      setLotteryDataDrawId(homeDrawId);
      updates.push('draw');
    }
    
    // Only trigger refresh if we actually made updates
    if (updates.length > 0) {
      setRefreshTrigger(prev => prev + 1);
      
      // Only refetch participants if draw ID changed
      if (updates.includes('draw')) {
        refetchDrawParticipants();
      }
    }
  }, [homeSeriesIndex, homeDrawId, selectedDrawId, selectedSeriesIndex, setLotteryDataSeriesIndex, setLotteryDataDrawId, refetchDrawParticipants]);
  
  // ADDITIONAL EFFECT: Force key changes and refetches on every refresh trigger
  // This ensures that child components always re-render with fresh data
  useEffect(() => {
    // This effect runs whenever refreshTrigger changes
    console.log("Home - Refresh trigger changed, forcing data refresh:", refreshTrigger);
    
    // Force direct refetch of participants and other data
    if (homeDrawId) {
      console.log("Home - Force refetching all data for draw ID:", homeDrawId);
      refetchDrawParticipants();
      
      // Pass the updated keys to children
      // (This is handled automatically by the key props in render)
    }
  }, [refreshTrigger, homeDrawId, refetchDrawParticipants]);

  // Debug log for state changes
  console.log("Home component - shared lottery state:", { 
    homeSeriesIndex, 
    homeDrawId
  });

  return (
    <>
      <HeroBanner 
        sharedSeriesIndex={homeSeriesIndex}
        setSharedSeriesIndex={handleHomeSeriesIndexChange}
        sharedDrawId={homeDrawId}
        setSharedDrawId={setHomeDrawId}
        key={`hero-${refreshTrigger}-${homeSeriesIndex}-${homeDrawId}`}
      />
      {/* Pass the shared state to LotteryStats */}
      <LotteryStats 
        sharedSeriesIndex={homeSeriesIndex}
        sharedDrawId={homeDrawId}
        key={`stats-${refreshTrigger}-${homeSeriesIndex}-${homeDrawId}`}
      />
      {/* Pass the shared state and update functions to BuyTickets */}
      <BuyTickets 
        sharedSeriesIndex={homeSeriesIndex}
        setSharedSeriesIndex={handleHomeSeriesIndexChange}
        sharedDrawId={homeDrawId}
        setSharedDrawId={setHomeDrawId}
        key={`buy-${refreshTrigger}-${homeSeriesIndex}-${homeDrawId}`}
      />
      <ParticipantsList 
        sharedSeriesIndex={homeSeriesIndex}
        sharedDrawId={homeDrawId}
        key={`participants-${refreshTrigger}-${homeSeriesIndex}-${homeDrawId}`}
      />
      <PastWinners 
        sharedSeriesIndex={homeSeriesIndex}
        sharedDrawId={homeDrawId} 
        key={`winners-${refreshTrigger}-${homeSeriesIndex}-${homeDrawId}`}
      />
      <FAQSection />
    </>
  );
}
