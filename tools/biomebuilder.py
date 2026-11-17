# Minecraft OverworldBiomeBuilder re-implemented; version '1.19' reproduces the 1.19.2 report, 'latest' adds cherry grove (1.20) + pale garden (1.21.4)
import json, sys
import numpy as np
def q(x): return int(np.float32(x)*np.float32(10000))
def span(a,b):
    a = a if isinstance(a,tuple) else (q(a),q(a)); b = b if isinstance(b,tuple) else (q(b),q(b))
    return (a[0], b[1])
def S(a,b): return (q(a), q(b))
def P(a): return (q(a), q(a))
def build(version):
    out=[]
    FULL=S(-1,1)
    T=[S(-1,-0.45),S(-0.45,-0.15),S(-0.15,0.2),S(0.2,0.55),S(0.55,1)]
    H=[S(-1,-0.35),S(-0.35,-0.1),S(-0.1,0.1),S(0.1,0.3),S(0.3,1)]
    E=[S(-1,-0.78),S(-0.78,-0.375),S(-0.375,-0.2225),S(-0.2225,0.05),S(0.05,0.45),S(0.45,0.55),S(0.55,1)]
    FROZEN=T[0]; UNFROZEN=span(T[1],T[4])
    mush=S(-1.2,-1.05); deep=S(-1.05,-0.455); ocean=S(-0.455,-0.19); coast=S(-0.19,-0.11); inland=S(-0.11,0.55)
    near=S(-0.11,0.03); mid=S(0.03,0.3); far=S(0.3,1)
    OCEANS=[['deep_frozen_ocean','deep_cold_ocean','deep_ocean','deep_lukewarm_ocean','warm_ocean'],['frozen_ocean','cold_ocean','ocean','lukewarm_ocean','warm_ocean']]
    MID=[['snowy_plains','snowy_plains','snowy_plains','snowy_taiga','taiga'],['plains','plains','forest','taiga','old_growth_spruce_taiga'],['flower_forest','plains','forest','birch_forest','dark_forest'],['savanna','savanna','forest','jungle','jungle'],['desert']*5]
    MIDV=[['ice_spikes',None,'snowy_taiga',None,None],[None,None,None,None,'old_growth_pine_taiga'],['sunflower_plains',None,None,'old_growth_birch_forest',None],[None,None,'plains','sparse_jungle','bamboo_jungle'],[None]*5]
    PLAT=[['snowy_plains','snowy_plains','snowy_plains','snowy_taiga','snowy_taiga'],['meadow','meadow','forest','taiga','old_growth_spruce_taiga'],['meadow','meadow','meadow','meadow','dark_forest'],['savanna_plateau','savanna_plateau','forest','forest','jungle'],['badlands','badlands','badlands','wooded_badlands','wooded_badlands']]
    PLATV=[['ice_spikes',None,None,None,None],[None,None,'meadow','meadow','old_growth_pine_taiga'],[None,None,'forest','birch_forest',None],[None]*5,['eroded_badlands','eroded_badlands',None,None,None]]
    if version=='latest':
        PLATV[1][0]='cherry_grove'; PLATV[2][0]='cherry_grove'; PLATV[2][1]='cherry_grove'
        PLAT[2][4]='pale_garden'
        MIDV[1][0]='dappled_forest'
    SHAT=[['windswept_gravelly_hills','windswept_gravelly_hills','windswept_hills','windswept_forest','windswept_forest']]*2+[['windswept_hills','windswept_hills','windswept_hills','windswept_forest','windswept_forest'],[None]*5,[None]*5]
    def add(t,h,c,e,w,b):
        for d in (P(0),P(1)): out.append((b,(t,h,c,e,d,w,0)))
    def addU(t,h,c,e,w,b): out.append((b,(t,h,c,e,S(0.2,0.9),w,0)))
    def addB(t,h,c,e,w,b): out.append((b,(t,h,c,e,P(1.1),w,0)))
    neg=lambda w: w[1]<0
    def pMid(i,j,w):
        if neg(w): return MID[i][j]
        v=MIDV[i][j]; return v or MID[i][j]
    def pBad(j,w):
        if j<2: return 'badlands' if neg(w) else 'eroded_badlands'
        return 'badlands' if j<3 else 'wooded_badlands'
    def pMidBad(i,j,w): return pBad(j,w) if i==4 else pMid(i,j,w)
    def pPlat(i,j,w):
        if not neg(w):
            v=PLATV[i][j]
            if v: return v
        return PLAT[i][j]
    def pSlope(i,j,w):
        if i>=3: return pPlat(i,j,w)
        return 'snowy_slopes' if j<=1 else 'grove'
    def pMidBadSlope(i,j,w): return pSlope(i,j,w) if i==0 else pMidBad(i,j,w)
    def pSav(i,j,w,u): return 'windswept_savanna' if i>1 and j<4 and w[1]>=0 else u
    def pBeach(i,j): return 'snowy_beach' if i==0 else 'desert' if i==4 else 'beach'
    def pShatCoast(i,j,w): return pSav(i,j,w, pMid(i,j,w) if w[1]>=0 else pBeach(i,j))
    def pPeak(i,j,w):
        if i<=2: return 'jagged_peaks' if neg(w) else 'frozen_peaks'
        if i==3: return 'stony_peaks'
        return pBad(j,w)
    def pShat(i,j,w): return SHAT[i][j] or pMid(i,j,w)
    def peaks(w):
        for i in range(5):
            for j in range(5):
                t,h=T[i],H[j]; m=pMid(i,j,w); mb=pMidBad(i,j,w); mbs=pMidBadSlope(i,j,w); pl=pPlat(i,j,w); sh=pShat(i,j,w); ss=pSav(i,j,w,sh); pk=pPeak(i,j,w)
                add(t,h,span(coast,far),E[0],w,pk); add(t,h,span(coast,near),E[1],w,mbs); add(t,h,span(mid,far),E[1],w,pk)
                add(t,h,span(coast,near),span(E[2],E[3]),w,m); add(t,h,span(mid,far),E[2],w,pl); add(t,h,mid,E[3],w,mb); add(t,h,far,E[3],w,pl)
                add(t,h,span(coast,far),E[4],w,m); add(t,h,span(coast,near),E[5],w,ss); add(t,h,span(mid,far),E[5],w,sh); add(t,h,span(coast,far),E[6],w,m)
    def high(w):
        for i in range(5):
            for j in range(5):
                t,h=T[i],H[j]; m=pMid(i,j,w); mb=pMidBad(i,j,w); mbs=pMidBadSlope(i,j,w); pl=pPlat(i,j,w); sh=pShat(i,j,w); ss=pSav(i,j,w,m); sl=pSlope(i,j,w); pk=pPeak(i,j,w)
                add(t,h,coast,span(E[0],E[1]),w,m); add(t,h,near,E[0],w,sl); add(t,h,span(mid,far),E[0],w,pk); add(t,h,near,E[1],w,mbs); add(t,h,span(mid,far),E[1],w,sl)
                add(t,h,span(coast,near),span(E[2],E[3]),w,m); add(t,h,span(mid,far),E[2],w,pl); add(t,h,mid,E[3],w,mb); add(t,h,far,E[3],w,pl)
                add(t,h,span(coast,far),E[4],w,m); add(t,h,span(coast,near),E[5],w,ss); add(t,h,span(mid,far),E[5],w,sh); add(t,h,span(coast,far),E[6],w,m)
    def midS(w):
        add(FULL,FULL,coast,span(E[0],E[2]),w,'stony_shore'); add(span(T[1],T[2]),FULL,span(near,far),E[6],w,'swamp'); add(span(T[3],T[4]),FULL,span(near,far),E[6],w,'mangrove_swamp')
        for i in range(5):
            for j in range(5):
                t,h=T[i],H[j]; m=pMid(i,j,w); mb=pMidBad(i,j,w); mbs=pMidBadSlope(i,j,w); sh=pShat(i,j,w); pl=pPlat(i,j,w); be=pBeach(i,j); ss=pSav(i,j,w,m); sc=pShatCoast(i,j,w); sl=pSlope(i,j,w)
                add(t,h,span(near,far),E[0],w,sl); add(t,h,span(near,mid),E[1],w,mbs); add(t,h,far,E[1],w,sl if i==0 else pl)
                add(t,h,near,E[2],w,m); add(t,h,mid,E[2],w,mb); add(t,h,far,E[2],w,pl); add(t,h,span(coast,near),E[3],w,m); add(t,h,span(mid,far),E[3],w,mb)
                if neg(w): add(t,h,coast,E[4],w,be); add(t,h,span(near,far),E[4],w,m)
                else: add(t,h,span(coast,far),E[4],w,m)
                add(t,h,coast,E[5],w,sc); add(t,h,near,E[5],w,ss); add(t,h,span(mid,far),E[5],w,sh)
                add(t,h,coast,E[6],w,be if neg(w) else m)
                if i==0: add(t,h,span(near,far),E[6],w,m)
    def low(w):
        add(FULL,FULL,coast,span(E[0],E[2]),w,'stony_shore'); add(span(T[1],T[2]),FULL,span(near,far),E[6],w,'swamp'); add(span(T[3],T[4]),FULL,span(near,far),E[6],w,'mangrove_swamp')
        for i in range(5):
            for j in range(5):
                t,h=T[i],H[j]; m=pMid(i,j,w); mb=pMidBad(i,j,w); mbs=pMidBadSlope(i,j,w); be=pBeach(i,j); ss=pSav(i,j,w,m)
                add(t,h,near,span(E[0],E[1]),w,mb); add(t,h,span(mid,far),span(E[0],E[1]),w,mbs); add(t,h,near,span(E[2],E[3]),w,m); add(t,h,span(mid,far),span(E[2],E[3]),w,mb)
                add(t,h,coast,span(E[3],E[4]),w,be); add(t,h,span(near,far),E[4],w,m); add(t,h,coast,E[5],w,pShatCoast(i,j,w)); add(t,h,near,E[5],w,ss); add(t,h,span(mid,far),E[5],w,m); add(t,h,coast,E[6],w,be)
                if i==0: add(t,h,span(near,far),E[6],w,m)
    def valleys(w):
        add(FROZEN,FULL,coast,span(E[0],E[1]),w,'stony_shore' if neg(w) else 'frozen_river'); add(UNFROZEN,FULL,coast,span(E[0],E[1]),w,'stony_shore' if neg(w) else 'river')
        add(FROZEN,FULL,near,span(E[0],E[1]),w,'frozen_river'); add(UNFROZEN,FULL,near,span(E[0],E[1]),w,'river')
        add(FROZEN,FULL,span(coast,far),span(E[2],E[5]),w,'frozen_river'); add(UNFROZEN,FULL,span(coast,far),span(E[2],E[5]),w,'river')
        add(FROZEN,FULL,coast,E[6],w,'frozen_river'); add(UNFROZEN,FULL,coast,E[6],w,'river')
        add(span(T[1],T[2]),FULL,span(inland,far),E[6],w,'swamp'); add(span(T[3],T[4]),FULL,span(inland,far),E[6],w,'mangrove_swamp'); add(FROZEN,FULL,span(inland,far),E[6],w,'frozen_river')
        for i in range(5):
            for j in range(5): add(T[i],H[j],span(mid,far),span(E[0],E[1]),w,pMidBad(i,j,w))
    add(FULL,FULL,mush,FULL,FULL,'mushroom_fields')
    for i in range(5): add(T[i],FULL,deep,FULL,FULL,OCEANS[0][i]); add(T[i],FULL,ocean,FULL,FULL,OCEANS[1][i])
    midS(S(-1,-0.93333334)); high(S(-0.93333334,-0.7666667)); peaks(S(-0.7666667,-0.56666666)); high(S(-0.56666666,-0.4)); midS(S(-0.4,-0.26666668)); low(S(-0.26666668,-0.05)); valleys(S(-0.05,0.05))
    low(S(0.05,0.26666668)); midS(S(0.26666668,0.4)); high(S(0.4,0.56666666)); peaks(S(0.56666666,0.7666667)); high(S(0.7666667,0.93333334)); midS(S(0.93333334,1))
    addU(FULL,FULL,S(0.8,1),FULL,FULL,'dripstone_caves'); addU(FULL,S(0.7,1),FULL,FULL,FULL,'lush_caves')
    if version=='latest': addU(FULL,FULL,S(-0.19,0.55),S(0.45,1),S(-1.1,-0.85),'sulfur_caves')
    addB(FULL,FULL,FULL,span(E[0],E[1]),FULL,'deep_dark')
    return out
if __name__=='__main__':
    rep=json.load(open(sys.argv[1]))['biomes']
    def rq(v): return (int(round(v*10000)),)*2 if not isinstance(v,list) else (int(round(v[0]*10000)),int(round(v[1]*10000)))
    R=[(e['biome'][10:],tuple(rq(e['parameters'][k]) for k in ['temperature','humidity','continentalness','erosion','depth','weirdness']) + (int(round(e["parameters"]["offset"]*10000)),)) for e in rep]
    M=[(b,p[:6]+(p[6],)) for b,p in build('1.19')]
    print(len(R),len(M),'exact order match' if R==M else 'MISMATCH')
    if R!=M:
        for k,(a,b) in enumerate(zip(R,M)):
            if a!=b: print(k,a,b); break
    lat=build('latest'); json.dump([[b]+[list(x) if isinstance(x,tuple) else x for x in p] for b,p in lat], open(sys.argv[2],'w'), separators=(',',':'))
    import collections; print(collections.Counter(b for b,_ in lat)['cherry_grove'], 'cherry', collections.Counter(b for b,_ in lat)['pale_garden'],'pale')
