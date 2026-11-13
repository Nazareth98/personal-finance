import {useEffect,useState} from 'react';
import {parseThemePreference,resolveTheme,THEME_STORAGE_KEY,type ThemePreference} from '../lib/theme';

const mediaQuery='(prefers-color-scheme: dark)';
function safeRead():ThemePreference {
  try{return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));}
  catch{return 'system';}
}
function prefersDark() {return typeof window.matchMedia === 'function' && window.matchMedia(mediaQuery).matches;}
export function useTheme() {
  const [preference,setPreference]=useState<ThemePreference>(safeRead);
  const [systemDark,setSystemDark]=useState(prefersDark);
  const theme=resolveTheme(preference,systemDark);
  useEffect(()=>{
    if(typeof window.matchMedia!=='function')return;
    const query=window.matchMedia(mediaQuery);
    const update=()=>setSystemDark(query.matches);
    update();
    query.addEventListener('change',update);
    return ()=>query.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const sync=(event:StorageEvent)=>{
      if(event.key===THEME_STORAGE_KEY || event.key===null)setPreference(parseThemePreference(event.newValue));
    };
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[]);
  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    const themeMeta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if(themeMeta)themeMeta.content=theme==='dark'?'#0B1220':'#F8FAFC';
    try{window.localStorage.setItem(THEME_STORAGE_KEY,preference);}catch{/* storage may be blocked */}
  },[theme,preference]);
  return {theme,preference,setPreference};
}
