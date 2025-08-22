import { useMemo } from 'react';

/**
 * useStyle hook for managing Tailwind CSS classes
 * Provides a centralized system for reusable style components
 * 
 * @param {Object} customStyles - Optional custom styles to merge with base styles
 * @returns {Object} Object containing Tailwind class strings for common components
 */
export const useStyle = () => {
  const baseStyles = useMemo(() => ({
    // Modern button styles with futuristic effects
    button: {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 flex items-center gap-3 min-w-[140px] justify-center shadow-md',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2',
      ghost: 'bg-transparent hover:bg-white/10 text-gray-600 hover:text-gray-800 font-medium py-3 px-6 rounded-xl transition-all duration-300 active:scale-95 min-h-[48px] touch-manipulation backdrop-blur-sm',
      danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/25 active:scale-95 min-h-[48px] touch-manipulation',
      success: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 active:scale-95 min-h-[48px] touch-manipulation',
      small: 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium py-2 px-4 text-sm rounded-lg transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[40px] touch-manipulation',
      reset: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-2 px-4 text-sm rounded-lg transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[40px] touch-manipulation',
      floating: 'fixed w-16 h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:from-indigo-600 hover:via-purple-600 hover:to-cyan-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center text-xl active:scale-90 z-50 touch-manipulation backdrop-blur-sm'
    },

    // Futuristic card styles with advanced glass morphism
    card: {
      base: 'bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl shadow-black/5',
      elevated: 'bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl shadow-black/10 hover:shadow-3xl hover:shadow-black/15 transition-all duration-500',
      interactive: 'bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl shadow-black/5 transition-all duration-300 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 hover:scale-[1.02] cursor-pointer touch-manipulation group',
      glass: 'bg-white/20 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/5',
      gradient: 'bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl shadow-black/5',
      floating: 'bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-black/10 hover:shadow-3xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-3 hover:rotate-1',
      stack: 'relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl shadow-black/5 before:absolute before:content-[""] before:w-[96%] before:h-[98%] before:bg-white/40 before:backdrop-blur-lg before:rounded-2xl before:top-2 before:left-1/2 before:-translate-x-1/2 before:-z-10 before:shadow-lg'
    },

    // Enhanced input styles with modern aesthetics
    input: {
      base: 'w-full px-5 py-4 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 bg-white/80 backdrop-blur-md text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md focus:shadow-lg',
      modern: 'w-full px-5 py-4 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 bg-white/60 backdrop-blur-xl text-gray-900 placeholder-gray-400 shadow-lg hover:shadow-xl focus:shadow-2xl focus:-translate-y-0.5',
      error: 'w-full px-5 py-4 border border-red-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 bg-white/80 backdrop-blur-md text-gray-900 shadow-sm hover:shadow-md',
      success: 'w-full px-5 py-4 border border-emerald-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 bg-white/80 backdrop-blur-md text-gray-900 shadow-sm hover:shadow-md',
      textarea: 'w-full px-5 py-4 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-vertical min-h-[140px] transition-all duration-300 bg-white/80 backdrop-blur-md text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md focus:shadow-lg',
      search: 'w-full px-5 py-4 pl-12 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 bg-white/80 backdrop-blur-md text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md focus:shadow-lg'
    },

    // Layout styles - Mobile-first responsive
    layout: {
      container: 'max-w-md mx-auto px-4 py-6 md:max-w-2xl md:px-6 md:py-8',
      containerLarge: 'max-w-2xl mx-auto px-4 py-6 md:max-w-4xl md:px-8 md:py-12',
      containerFull: 'w-full px-4 py-6 md:px-8 md:py-8',
      flexCenter: 'flex items-center justify-center',
      flexBetween: 'flex items-center justify-between',
      flexCol: 'flex flex-col',
      flexColCenter: 'flex flex-col items-center justify-center',
      grid: 'grid gap-4 md:gap-6',
      gridCols2: 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6',
      gridCols3: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6',
      stack: 'space-y-4 md:space-y-6'
    },

    // Text styles - Responsive typography
    text: {
      hero: 'text-3xl font-bold text-gray-900 md:text-4xl lg:text-5xl',
      heading: 'text-2xl font-bold text-gray-900 md:text-3xl',
      subheading: 'text-xl font-semibold text-gray-800 md:text-2xl',
      body: 'text-base text-gray-700 leading-relaxed',
      bodyLarge: 'text-lg text-gray-700 leading-relaxed',
      small: 'text-sm text-gray-600',
      tiny: 'text-xs text-gray-500',
      muted: 'text-sm text-gray-500',
      error: 'text-sm text-red-600 font-medium',
      success: 'text-sm text-green-600 font-medium',
      warning: 'text-sm text-orange-600 font-medium',
      gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold'
    },

    // Modal and overlay styles
    modal: {
      overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50',
      content: 'bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 md:p-8',
      contentLarge: 'bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 md:p-8',
      bottomSheet: 'fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg rounded-t-2xl p-6 transform transition-transform duration-300 ease-out z-50 max-h-[80vh] overflow-y-auto border-t border-white/20'
    },

    // Toast notification styles
    toast: {
      success: 'bg-green-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg border border-green-400/30 flex items-center gap-3',
      error: 'bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg border border-red-400/30 flex items-center gap-3',
      warning: 'bg-orange-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg border border-orange-400/30 flex items-center gap-3',
      info: 'bg-blue-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg border border-blue-400/30 flex items-center gap-3'
    },

    // Badge styles
    badge: {
      primary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
      success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
      warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800',
      error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800',
      gray: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800',
      outline: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700'
    },

    // Progress styles
    progress: {
      container: 'w-full bg-gray-200 rounded-full h-2 overflow-hidden',
      bar: 'h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out',
      barSuccess: 'h-full bg-green-500 rounded-full transition-all duration-300 ease-out',
      barWarning: 'h-full bg-orange-500 rounded-full transition-all duration-300 ease-out',
      barError: 'h-full bg-red-500 rounded-full transition-all duration-300 ease-out'
    },

    // Loading states
    loading: {
      spinner: 'animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500',
      spinnerLarge: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500',
      pulse: 'animate-pulse bg-gray-200 rounded',
      skeleton: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded'
    },

    // Animation utilities
    animation: {
      fadeIn: 'animate-in fade-in duration-200',
      fadeOut: 'animate-out fade-out duration-200',
      slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
      slideDown: 'animate-in slide-in-from-top-4 duration-300',
      scaleIn: 'animate-in zoom-in-95 duration-200',
      scaleOut: 'animate-out zoom-out-95 duration-200',
      bounce: 'animate-bounce',
      pulse: 'animate-pulse'
    },

    // State utilities
    state: {
      loading: 'pointer-events-none opacity-50 cursor-wait',
      disabled: 'pointer-events-none opacity-50 cursor-not-allowed',
      active: 'bg-blue-50 border-blue-500 text-blue-700',
      hover: 'hover:bg-white/5 hover:shadow-md transition-all duration-200',
      focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      interactive: 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
    },

    // Responsive utilities
    responsive: {
      hideOnMobile: 'hidden md:block',
      hideOnDesktop: 'block md:hidden',
      mobileOnly: 'block md:hidden',
      desktopOnly: 'hidden md:block',
      stackOnMobile: 'flex flex-col md:flex-row',
      centerOnMobile: 'text-center md:text-left'
    },

    // Form group styles
    form: {
      group: 'space-y-2',
      label: 'block text-sm font-medium text-gray-700 mb-1',
      labelRequired: 'block text-sm font-medium text-gray-700 mb-1 after:content-["*"] after:text-red-500 after:ml-1',
      helper: 'text-xs text-gray-500 mt-1',
      error: 'text-xs text-red-600 mt-1 font-medium',
      fieldset: 'space-y-4 p-4 border border-gray-200 rounded-lg',
      legend: 'text-sm font-medium text-gray-900 px-2 -ml-2'
    },

    // Advanced glass morphism effects - Futuristic implementation
    glass: {
      base: 'backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/5',
      light: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/5 rounded-2xl',
      medium: 'bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/10 rounded-2xl',
      heavy: 'bg-white/20 backdrop-blur-3xl border border-white/30 shadow-3xl shadow-black/15 rounded-2xl',
      ultra: 'bg-gradient-to-br from-white/30 via-white/10 to-white/5 backdrop-blur-3xl border border-white/20 shadow-3xl shadow-indigo-500/10 rounded-2xl',
      card: 'bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-black/5 transition-all duration-500 hover:shadow-3xl hover:shadow-indigo-500/10',
      cardHover: 'bg-white/12 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-3xl shadow-indigo-500/15 transform -translate-y-2 scale-[1.02] transition-all duration-500',
      floating: 'bg-white/6 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl shadow-black/10 hover:shadow-3xl hover:shadow-indigo-500/20 transition-all duration-700 hover:-translate-y-4 hover:rotate-2'
    }
  }), []);

  // Return base styles only; components should merge their local customStyles if needed
  return baseStyles;
};


