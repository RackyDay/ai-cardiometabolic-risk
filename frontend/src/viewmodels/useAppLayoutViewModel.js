import { useState } from "react";
import { useLocation } from "react-router-dom";

function useAppLayoutViewModel() {
  const location = useLocation();

  const pagesWithoutSideNav = ["/", "/inputs", "/auth"];
  const shouldShowSideNav = !pagesWithoutSideNav.includes(location.pathname);

  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  // Tracks the pathname the drawer's open/closed state was last computed
  // for, so it can be closed on every route change without an Effect - see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // Setting state directly in the render body like this is safe and
  // intentional: React re-renders immediately with the update before
  // committing, so it never paints the stale (still-open) state.
  const [pathnameForSideNav, setPathnameForSideNav] = useState(location.pathname);

  if (location.pathname !== pathnameForSideNav) {
    setPathnameForSideNav(location.pathname);
    setIsSideNavOpen(false);
  }

  const openSideNav = () => setIsSideNavOpen(true);
  const closeSideNav = () => setIsSideNavOpen(false);
  const toggleSideNav = () => setIsSideNavOpen((current) => !current);

  return {
    shouldShowSideNav,
    isSideNavOpen,
    openSideNav,
    closeSideNav,
    toggleSideNav,
  };
}

export default useAppLayoutViewModel;
