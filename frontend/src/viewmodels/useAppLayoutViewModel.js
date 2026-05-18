import { useLocation } from "react-router-dom";
 
function useAppLayoutViewModel() {
  const location = useLocation();
 
  const pagesWithoutSideNav = ["/", "/inputs"];
  const shouldShowSideNav = !pagesWithoutSideNav.includes(location.pathname);
 
  return {
    shouldShowSideNav,
  };
}
 
export default useAppLayoutViewModel;
 