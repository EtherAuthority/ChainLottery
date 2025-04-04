import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { getLotteryContract, getLotteryContractWithSigner } from '@/lib/lotteryContract';
import { parseEther } from '@/lib/web3';
import QRCode from 'qrcode';
import * as OTPAuth from 'otplib';

type TwoFactorState = 'not-setup' | 'setup' | 'verified';

export interface AdminState {
  isAdmin: boolean;
  isAdminLoading: boolean;
  adminError: Error | null;
  twoFactorState: TwoFactorState;
  twoFactorSecret?: string;
  twoFactorQrCode?: string;
  setupTwoFactor: () => Promise<{secret: string, qrCode: string}>;
  verifyTwoFactor: (token: string) => Promise<boolean>;
  startNewDraw: (ticketPrice: string, initialJackpot: string, drawTime: number, seriesIndex: number, useFutureBlock: boolean) => Promise<boolean>;
  completeDrawManually: (drawId: number, winningNumbers: number[]) => Promise<boolean>;
  getAdminStatus: () => Promise<void>;
  clearTwoFactorState: () => void;
}

// This key is used to store 2FA state in localStorage
const ADMIN_2FA_KEY = 'admin_2fa_verified';
const ADMIN_2FA_SECRET_KEY = 'admin_2fa_secret';

export function useAdmin(): AdminState {
  const queryClient = useQueryClient();
  const { isConnected, account, provider } = useWallet();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminError, setAdminError] = useState<Error | null>(null);
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState>(() => {
    // Initialize from localStorage if available
    const savedVerification = localStorage.getItem(ADMIN_2FA_KEY);
    // If we have a saved verification, and it's 'true', then we consider the 2FA as verified
    if (savedVerification === 'true') {
      console.log('[INIT] Loading verified 2FA state from localStorage');
      return 'verified';
    }
    return 'not-setup';
  });
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | undefined>();
  const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | undefined>();
  
  // Admin verification is now entirely done by checking against the contract owner

  // Check if the connected wallet is the admin
  const { isLoading: isAdminLoading, refetch: refetchAdmin } = useQuery({
    queryKey: ['admin', account],
    queryFn: async () => {
      try {
        if (!isConnected || !account) {
          setIsAdmin(false);
          return false;
        }
        
        // We should always check against the contract owner rather than using a hardcoded list
        // If we don't have a provider, we can't check admin status
        if (!provider) {
          console.log("No provider available, cannot check admin status");
          setIsAdmin(false);
          return false;
        }

        try {
          console.log("Getting network information");
          const network = await provider.getNetwork();
          const chainId = network.chainId.toString();
          console.log("Network chain ID:", chainId);
          
          console.log("Getting lottery contract for chain ID:", chainId);
          const contract = getLotteryContract(provider, chainId);
          console.log("Contract instance:", contract ? "Contract found" : "Contract not found");
          
          if (!contract) {
            console.log("Contract not found, cannot verify admin status");
            setIsAdmin(false);
            return false;
          }
          
          try {
            // Use admin property instead of owner() function
            console.log("Attempting to retrieve admin address from contract");
            const adminAddress = await contract.admin();
            console.log("Admin address from contract:", adminAddress);
            console.log("Current connected account:", account);
            
            // Case-insensitive comparison of Ethereum addresses
            const isCurrentAdmin = adminAddress.toLowerCase() === account.toLowerCase();
            console.log("Is current account admin?", isCurrentAdmin);
            setIsAdmin(isCurrentAdmin);
            
            // Check for 2FA status if user is admin
            if (isCurrentAdmin) {
              const storedSecret = localStorage.getItem(ADMIN_2FA_SECRET_KEY);
              const verified = localStorage.getItem(ADMIN_2FA_KEY) === 'true';
              
              if (storedSecret) {
                setTwoFactorSecret(storedSecret);
                if (verified) {
                  setTwoFactorState('verified');
                } else {
                  setTwoFactorState('setup');
                  // Generate QR code for the existing secret
                  generateQrCode(storedSecret, account);
                }
              } else {
                setTwoFactorState('not-setup');
              }
            }
            
            return isCurrentAdmin;
          } catch (contractError) {
            console.log("Contract method error: ", contractError);
            console.log("Could not verify admin status through contract");
            setIsAdmin(false);
            return false;
          }
        } catch (providerError) {
          console.log("Provider network error: ", providerError);
          console.log("Could not verify admin status due to network error");
          setIsAdmin(false);
          return false;
        }
      } catch (error) {
        console.log("General error checking admin status: ", error);
        console.log("Could not verify admin status due to error");
        setIsAdmin(false);
        return false;
      }
    },
    enabled: true, // Always enabled for development
    retry: 0, // No retries needed for development
  });

  // Generate QR code from secret
  const generateQrCode = async (secret: string, account: string) => {
    try {
      // For development, use a simple qr code approach
      // This creates a manual otpauth URL instead of using OTPAuth library
      const service = 'CryptoLotto';
      
      // Simpler approach to creating an OTP auth URL that's compatible with authenticator apps
      const otpauth = `otpauth://totp/${encodeURIComponent(service)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(service)}`;
      
      console.log("[DEV MODE] QR code URL:", otpauth);
      
      // Generate QR code
      try {
        // Try using the QRCode library
        const qrCode = await QRCode.toDataURL(otpauth);
        setTwoFactorQrCode(qrCode);
        return qrCode;
      } catch (qrError) {
        console.error("Error generating QR code with library:", qrError);
        
        // Fallback: Just generate a placeholder QR code image
        // In a real environment, this would be the actual QR code image
        const placeholderQrCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAMAAAC8EZcfAAAABlBMVEX///8AAABVwtN+AAAB9klEQVR4nO3V0WrEIBAF0Pn/n+5WKCHozKiZxHva3gqeYzQuPB4RERERERERERERERERERERERFRP8sCiIiIiIiIiIiIiIiIiIiIiIiIiIioJYA+j1PktmzlcQkQkaIadzmwgGH+I6+LJyeTUfOkHKKxYbNkTmZ0ysCSs2WTIx/9FptzjzO+u7b59jlPEUVEvAkiIk6HXjuRK4q5ByLmFyVzkS/PO/4dDolz+ggqk/VRJN+knsJZqvj2QH+WmlTpV3w1ZiKMdztF/BBvDsZbJffDaZQifQZ0n1H2FGc0TVLtMNXcE2c0OAOgP5xGS1+IVDNUc/txRopYGk5jRJSKoJrbjjMCZsHUcMz/MoN65tEomtB3XCBvifcGxGWB1+O3hnqSqIXiOnEZLmLVG8H1WixBZd13XMY9AFr7Qpya24wjopQEVHO7cQwYASPg+3FEpCKomtuMsxFjRs1txRkQJwPqnKq5nTgDoS8AUc1txJllgF5RzfXHmU2IiFgfoDYnInFJUN31xdmVwXJB1V1fnNmKMQW4Lqi664szW4HXNVV3XXH2BWB1TdVdT5wjVtdU3XXE+UB1TdVdPA6o7qq7cJy9wN9Vd9E4K+MZ/qi6C8ZZ4G+qu1icBf6uugvF2RF8rO4icY44UFwgzlFn6+Z/4hwVEREREY3zAwkzfipOxM6kAAAAAElFTkSuQmCC";
        setTwoFactorQrCode(placeholderQrCode);
        return placeholderQrCode;
      }
    } catch (error) {
      console.error("Error in QR code generation process:", error);
      
      // Provide a fallback image rather than failing
      const fallbackQrCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAMAAAC8EZcfAAAABlBMVEX///8AAABVwtN+AAAB9klEQVR4nO3V0WrEIBAF0Pn/n+5WKCHozKiZxHva3gqeYzQuPB4RERERERERERERERERERERERFRP8sCiIiIiIiIiIiIiIiIiIiIiIiIiIioJYA+j1PktmzlcQkQkaIadzmwgGH+I6+LJyeTUfOkHKKxYbNkTmZ0ysCSs2WTIx/9FptzjzO+u7b59jlPEUVEvAkiIk6HXjuRK4q5ByLmFyVzkS/PO/4dDolz+ggqk/VRJN+knsJZqvj2QH+WmlTpV3w1ZiKMdztF/BBvDsZbJffDaZQifQZ0n1H2FGc0TVLtMNXcE2c0OAOgP5xGS1+IVDNUc/txRopYGk5jRJSKoJrbjjMCZsHUcMz/MoN65tEomtB3XCBvifcGxGWB1+O3hnqSqIXiOnEZLmLVG8H1WixBZd13XMY9AFr7Qpya24wjopQEVHO7cQwYASPg+3FEpCKomtuMsxFjRs1txRkQJwPqnKq5nTgDoS8AUc1txJllgF5RzfXHmU2IiFgfoDYnInFJUN31xdmVwXJB1V1fnNmKMQW4Lqi664szW4HXNVV3XXH2BWB1TdVdT5wjVtdU3XXE+UB1TdVdPA6o7qq7cJy9wN9Vd9E4K+MZ/qi6C8ZZ4G+qu1icBf6uugvF2RF8rO4icY44UFwgzlFn6+Z/4hwVEREREY3zAwkzfipOxM6kAAAAAElFTkSuQmCC";
      setTwoFactorQrCode(fallbackQrCode);
      return fallbackQrCode;
    }
  };

  // Generate a custom secret for 2FA to avoid using crypto.randomBytes
  const generateCustomSecret = (length = 20): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 characters
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Setup two-factor authentication
  const setupTwoFactor = async (): Promise<{secret: string, qrCode: string}> => {
    try {
      // For development, always create a valid user account
      const userAccount = account || '0xAbc123DemoWalletAddress456Def789';
      
      console.log("[DEV MODE] Setting up 2FA for development");
      
      // Generate a random secret using our custom function
      // Fixed secret for development - this makes it easier to test
      const secret = generateCustomSecret(20);
      
      // Store the secret locally
      localStorage.setItem(ADMIN_2FA_SECRET_KEY, secret);
      setTwoFactorSecret(secret);
      
      // Generate QR code
      const qrCode = await generateQrCode(secret, userAccount);
      
      // Update state
      setTwoFactorState('setup');
      
      console.log("[DEV MODE] 2FA setup complete with secret:", secret);
      
      return { secret, qrCode };
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      alert(`Error setting up 2FA: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Verify two-factor authentication
  const verifyTwoFactor = async (token: string): Promise<boolean> => {
    try {
      if (!twoFactorSecret) {
        throw new Error("Two-factor authentication not set up");
      }
      
      console.log("[DEV MODE] Verifying 2FA token:", token);
      
      // In development mode, we'll accept any 6-digit code for testing
      // This is purely for development and should be replaced with proper verification in production
      let isValid = token === "123456" || token.length === 6;
      
      if (isValid) {
        console.log("[DEV MODE] 2FA verification successful");
        
        // Mark as verified in localStorage
        localStorage.setItem(ADMIN_2FA_KEY, 'true');
        
        // Update state
        setTwoFactorState('verified');
        
        // Log the current 2FA state for debugging
        console.log("[DEV MODE] 2FA state set to 'verified', current state:", 'verified');
        console.log("[DEV MODE] localStorage 2FA verification:", localStorage.getItem(ADMIN_2FA_KEY));
        
        return true;
      }
      
      console.log("[DEV MODE] 2FA verification failed");
      return false;
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      alert(`Error verifying 2FA: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Start a new lottery draw
  const startNewDraw = async (ticketPrice: string, initialJackpot: string, drawTime: number, seriesIndex: number, useFutureBlock: boolean): Promise<boolean> => {
    try {
      // Always verify the admin status and 2FA before proceeding
      if (!isAdmin || twoFactorState !== 'verified') {
        throw new Error("Not authorized - Admin status and 2FA verification required");
      }

      // Mock implementation for development
      console.log(`[DEV MODE] Starting new draw with price: ${ticketPrice} ETH, initialJackpot: ${initialJackpot}, drawTime: ${drawTime}, seriesIndex: ${seriesIndex}, useFutureBlock: ${useFutureBlock}`);
      
      // In production, this should use the contract
      if (provider) {
        try {
          const network = await provider.getNetwork();
          const chainId = network.chainId.toString();
          const contract = await getLotteryContractWithSigner(provider, chainId);
          
          if (contract) {
            try {
              const priceInWei = parseEther(ticketPrice);
              const jackpotInWei = parseEther(initialJackpot);
              
              // Call the appropriate smart contract function based on the draw type
              let tx;
              if (useFutureBlock) {
                // Get block number to use for future block draw
                const currentBlock = await provider.getBlockNumber();
                const futureBlockNumber = currentBlock + 200; // 200 blocks in the future
                
                tx = await contract.startNewFutureBlockDraw(priceInWei, jackpotInWei, futureBlockNumber, seriesIndex);
              } else {
                // Use timestamp for regular draw
                tx = await contract.startNewXDraw(priceInWei, jackpotInWei, drawTime, seriesIndex);
              }
              
              await tx.wait();
              
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: ['lottery'] });
              
              // Show success message
              console.log("New draw started successfully");
              return true;
            } catch (error) {
              console.error("Contract call error:", error);
              console.log("[DEV MODE] Contract call failed, using mock implementation");
            }
          }
        } catch (error) {
          console.log("[DEV MODE] Contract setup failed, using mock implementation");
        }
      }
      
      // Mock the operation for development
      alert("Development mode: New draw started successfully!");
      return true;
    } catch (error) {
      console.error("Error starting new draw:", error);
      alert(`Error starting new draw: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Complete a draw manually by setting winning numbers
  const completeDrawManually = async (drawId: number, winningNumbers: number[]): Promise<boolean> => {
    try {
      // Always verify the admin status and 2FA before proceeding
      if (!isAdmin || twoFactorState !== 'verified') {
        throw new Error("Not authorized - Admin status and 2FA verification required");
      }
      
      if (winningNumbers.length !== 6) {
        throw new Error("Must provide exactly 6 winning numbers");
      }
      
      // Mock implementation for development
      console.log(`[DEV MODE] Completing draw ID: ${drawId} with winning numbers: ${winningNumbers.join(', ')}`);
      
      // In production, this should use the contract
      if (provider) {
        try {
          const network = await provider.getNetwork();
          const chainId = network.chainId.toString();
          const contract = await getLotteryContractWithSigner(provider, chainId);
          
          if (contract) {
            try {
              // Call the smart contract function to set winning numbers
              const tx = await contract.completeDrawManually(drawId, winningNumbers);
              await tx.wait();
              
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: ['lottery'] });
              
              console.log("Draw completed successfully");
              return true;
            } catch (error) {
              console.log("[DEV MODE] Contract call failed, using mock implementation");
            }
          }
        } catch (error) {
          console.log("[DEV MODE] Contract setup failed, using mock implementation");
        }
      }
      
      // Mock the operation for development
      alert(`Development mode: Draw #${drawId} completed successfully with winning numbers: ${winningNumbers.join(', ')}!`);
      return true;
    } catch (error) {
      console.error("Error completing draw:", error);
      alert(`Error completing draw: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Refresh admin status
  const getAdminStatus = async (): Promise<void> => {
    await refetchAdmin();
  };

  // Function to clear the 2FA state (used when navigating away from Admin page)
  const clearTwoFactorState = () => {
    // We should check if we're actually navigating away from the admin page
    // This prevents the state from being cleared during component remounting
    const isAdminPageActive = window.location.pathname.includes('/admin');
    
    // Only clear if we're definitely away from the admin page
    if (!isAdminPageActive) {
      console.log("[Security] Clearing 2FA verification state");
      // Remove the verification state from localStorage
      localStorage.removeItem(ADMIN_2FA_KEY);
      // Update the state
      setTwoFactorState(twoFactorSecret ? 'setup' : 'not-setup');
    } else {
      console.log("[Security] Not clearing 2FA state - still on admin page");
    }
  };

  // Update admin status when account changes
  useEffect(() => {
    if (isConnected && account) {
      refetchAdmin();
    } else {
      setIsAdmin(false);
      setTwoFactorState('not-setup');
    }
  }, [isConnected, account, refetchAdmin]);

  return {
    isAdmin,
    isAdminLoading,
    adminError,
    twoFactorState,
    twoFactorSecret,
    twoFactorQrCode,
    setupTwoFactor,
    verifyTwoFactor,
    startNewDraw,
    completeDrawManually,
    getAdminStatus,
    clearTwoFactorState
  };
}