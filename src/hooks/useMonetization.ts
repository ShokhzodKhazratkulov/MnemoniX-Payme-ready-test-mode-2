
import { useState, useEffect, useCallback } from 'react';
import { Device } from '@capacitor/device';
import { supabase } from '../supabaseClient';
import { Profile, SubscriptionTier } from '../types';

export function useMonetization(profile: Profile | null, setProfile: React.Dispatch<React.SetStateAction<Profile | null>>) {
  const [isDeviceAuthorized, setIsDeviceAuthorized] = useState<boolean | null>(null);

  const checkSubscriptionStatus = useCallback((): SubscriptionTier => {
    if (!profile) return SubscriptionTier.FREE;

    // 1. Check Permanent Premium
    if (profile.subscription_tier === SubscriptionTier.PREMIUM) {
      if (profile.subscription_expires_at) {
        const expiry = new Date(profile.subscription_expires_at).getTime();
        if (expiry > Date.now()) return SubscriptionTier.PREMIUM;
      } else {
        // No expiry means lifetime or handled elsewhere
        return SubscriptionTier.PREMIUM;
      }
    }

    // 2. Check 7-Day Trial
    const trialStart = new Date(profile.trial_started_at).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() < trialStart + sevenDaysInMs) {
      return SubscriptionTier.TRIAL; // Trial users get Premium features
    }

    return SubscriptionTier.FREE;
  }, [profile]);

  const currentTier = checkSubscriptionStatus();
  const isPremium = currentTier === SubscriptionTier.PREMIUM || currentTier === SubscriptionTier.TRIAL;

  // Device ID management
  const verifyDevice = useCallback(async () => {
    if (!profile) return;

    try {
      const info = await Device.getId();
      const currentDeviceId = info.identifier;

      if (!profile.device_id) {
        // First time login - bind this device
        const { error } = await supabase
          .from('profiles')
          .update({ device_id: currentDeviceId })
          .eq('id', profile.id);

        if (!error) {
          setProfile(prev => prev ? { ...prev, device_id: currentDeviceId } : null);
          setIsDeviceAuthorized(true);
        }
      } else if (profile.device_id === currentDeviceId) {
        setIsDeviceAuthorized(true);
      } else {
        setIsDeviceAuthorized(false);
      }
    } catch (err) {
      console.error('Error verifying device:', err);
      // Fallback for web testing (capacitor might not be initialized)
      setIsDeviceAuthorized(true);
    }
  }, [profile, setProfile]);

  const resetDevice = useCallback(async () => {
    if (!profile) return;
    try {
      const info = await Device.getId();
      const currentDeviceId = info.identifier;
      
      const { error } = await supabase
        .from('profiles')
        .update({ device_id: currentDeviceId })
        .eq('id', profile.id);

      if (!error) {
        setProfile(prev => prev ? { ...prev, device_id: currentDeviceId } : null);
        setIsDeviceAuthorized(true);
      }
    } catch (err) {
      console.error('Error resetting device:', err);
    }
  }, [profile, setProfile]);

  // Daily search limit check
  const incrementSearchCount = async () => {
    if (!profile || isPremium) return true;

    const today = new Date().toISOString().split('T')[0];
    let newCount = profile.daily_search_count;

    if (profile.last_search_reset !== today) {
      newCount = 1;
    } else {
      if (newCount >= 5) return false; // Limit reached
      newCount += 1;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        daily_search_count: newCount,
        last_search_reset: today 
      })
      .eq('id', profile.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, daily_search_count: newCount, last_search_reset: today } : null);
    }
    
    return true;
  };

  return {
    currentTier,
    isPremium,
    isDeviceAuthorized,
    verifyDevice,
    resetDevice,
    incrementSearchCount,
    searchRemaining: isPremium ? Infinity : Math.max(0, 5 - (profile?.daily_search_count || 0))
  };
}
