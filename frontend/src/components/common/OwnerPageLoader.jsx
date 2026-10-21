import React from 'react';
import { PageLoader } from './AppLoader';

/**
 * OwnerPageLoader: Backward-compatible wrapper delegating to AppLoader.Page
 * Provides skeleton loading states, error boundaries with retry, and emerald/indigo branding.
 */
export const OwnerPageLoader = ({
  activeTab = 'dashboard',
  title,
  subtitle,
  error = null,
  onRetry = null
}) => {
  return (
    <PageLoader
      activeTab={activeTab}
      title={title}
      subtitle={subtitle}
      error={error}
      onRetry={onRetry}
    />
  );
};

export default OwnerPageLoader;
