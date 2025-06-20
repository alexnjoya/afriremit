import React, { useState,useEffect } from 'react';
import { ArrowUpDown, Settings, Info, X, Droplets } from 'lucide-react';
import LiquidityInterface from './LiquidityInterface';
import tokens from '@/lib/Tokens/tokens';
import { ethers, formatEther, parseEther } from 'ethers';
import { useContractInstances } from '@/provider/ContractInstanceProvider';
import { CONTRACT_ADDRESSES } from '@/provider/ContractInstanceProvider';


const roundToTwoDecimalPlaces = (num) => {
  return Math.round(num * 100) / 100;
};

const roundToFiveDecimalPlaces = (num) => {
  return Math.round(num * 100000) / 100000;
};

const SwapInterface = () => {
  const { isConnected, SWAP_CONTRACT_INSTANCE, PRICEAPI_CONTRACT_INSTANCE, TEST_TOKEN_CONTRACT_INSTANCE, fetchBalance, address } = useContractInstances()
  const [activeTab, setActiveTab] = useState('swap');
  const [fromToken, setFromToken] = useState('ETH');
   
  const [toToken, setToToken] = useState('AFR');
   const token1Address = tokens.find(t => t.symbol === fromToken)?.address;
    const token2Address = tokens.find(t => t.symbol === toToken)?.address;
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [deadline, setDeadline] = useState(20);
  const [autoRouter, setAutoRouter] = useState(true);


   const [token1Amount, setToken1Amount] = useState(null);
  const [token2Amount, setToken2Amount] = useState(null);

  const[isApproveOne,setApproveOne]=useState(false)
  
  const [hasApprovedOne,setHasApprovedOne]= useState(false)
  const[isSwapping,setSwapping]=useState(false)
  const [isOpen, setIsOpen] = useState(false);
  const [AmountOneInWei,setAmountOneInWei]=useState('')
  const [AmountTwoRate,setAmountTwoRate]=useState('')
  const [changeToken, setChangeToken] = useState(1);
  const[Bal1,setBal1] = useState(0)
  const[Bal2,setBal2] = useState(0)
  const[dollarRate,setDollarRate]= useState(null)
  const[baseTwoRate,setBaseTwoRate]=useState(null)
  const[isEstimateAmount2,setEstimatedAmount2]=useState(false)


const [poolPrices, setPoolPrices] = useState<{ [key: string]: string }>({});

 useEffect(() => {
  const fetchPrices = async () => {
    const pools = getAllLiquidityPools(); // e.g., ["ETH/USDC", "ETH/AFRC"]

    const prices: { [key: string]: string } = {};

    for (const pool of pools) {
      const [token1Symbol, token2Symbol] = pool.split("/");

      const token1Address = tokens.find(t => t.symbol === token1Symbol)?.address;
      const token2Address = tokens.find(t => t.symbol === token2Symbol)?.address;

      const TokenAmountInWei = ethers.parseEther("1");

      if (token1Address && token2Address) {
        try {
          const swapContract = await SWAP_CONTRACT_INSTANCE();
          const rate = await swapContract.estimate(
            token1Address,
            token2Address,
            TokenAmountInWei
          );
          const f_rate = ethers.formatEther(rate);
          prices[pool] = parseFloat(f_rate).toFixed(2);
        } catch (error) {
          console.error(`Failed to fetch price for ${pool}:`, error);
          prices[pool] = "Error";
        }
      } else {
        prices[pool] = "Unknown Tokens";
      }
    }

    setPoolPrices(prices);
    console.log("Fetched pool prices:", prices);
  };

  fetchPrices();
}, []);

// Filter tokens to exclude selected token from opposite dropdown
const getAvailableTokens = (selectedToken, isFromToken = true) => {
  if (isFromToken) {
    // For "From" token dropdown, show all tokens
    return tokens.filter(token => token.symbol !== selectedToken);
  } else {
    // For "To" token dropdown, show only tokens that have liquidity pools with the selected "From" token
    const fromTokenData = tokens.find(token => token.symbol === selectedToken);
    
    if (!fromTokenData || !fromTokenData.pool || fromTokenData.pool.length === 0) {
      // If the from token has no pools, return empty array or show a message
      return [];
    }
    
    // Return tokens that are in the pool array of the selected from token
    return tokens.filter(token => 
      fromTokenData.pool.includes(token.symbol)
    );
  }
};

// Handle token selection with automatic switching
const handleFromTokenChange = (event) => {
  const newFromToken = event.target.value;
  setFromToken(newFromToken);
  
  // Get available tokens for the new from token
  const availableToTokens = getAvailableTokens(newFromToken, false);
  
  // If current toToken is not available for the new fromToken, reset to first available or empty
  if (availableToTokens.length > 0 && !availableToTokens.some(token => token.symbol === toToken)) {
    setToToken(availableToTokens[0].symbol);
  } else if (availableToTokens.length === 0) {
    setToToken(''); // or set to a default value
  }
};


const handleToTokenChange = (event) => {
  const newToToken = event.target.value;
  setToToken(newToToken);
  // No need to change fromToken as it can be any token
};

  
useEffect(()=>{
  const fetchData = async () => {
    try {
      console.log('Fetching balances and rates...', token1Address, token2Address);
      const bal1 = await fetchBalance(token1Address);
      const bal2 = await fetchBalance(token2Address);
      const roundedBal1 = roundToTwoDecimalPlaces(bal1)
      const roundedBal2 = roundToTwoDecimalPlaces(bal2)
    
      
      setBal1(roundedBal1)
      setBal2(roundedBal2)
      
      const PRICE_CONTRACT = await PRICEAPI_CONTRACT_INSTANCE();
      
      // Add null check for PRICE_CONTRACT
      if (PRICE_CONTRACT && token1Address) {
        const dollarRate = await PRICE_CONTRACT.getLatestPrice(token1Address);
        const formattedDollarRate = ethers.formatEther(dollarRate);
        setDollarRate(formattedDollarRate);
      }

    } catch (error) {
      console.error(error);
    }
  };

  fetchData();

},[isConnected,isSwapping,fromToken,toToken,token1Amount, token2Amount,address,Bal1,Bal2,dollarRate,setDollarRate,PRICEAPI_CONTRACT_INSTANCE])


 const getAllLiquidityPools = () => {
    const pools: string[] = [];
    tokens.forEach(token => {
      if (Array.isArray(token.pool)) {
        token.pool.forEach(poolToken => {
          const pair = `${token.symbol}/${poolToken}`;
          const reversePair = `${poolToken}/${token.symbol}`;
          if (!pools.includes(pair) && !pools.includes(reversePair)) {
            pools.push(pair);
          }
        });
      }
    });
    return pools;
  };



  const calculateAmount2 = async () => {
    if (token1Amount !== null) {
      setEstimatedAmount2(true);
      const PRICE_CONTRACT = await PRICEAPI_CONTRACT_INSTANCE();
      
      // Add null check for PRICE_CONTRACT
      if (!PRICE_CONTRACT) {
        console.error('Price contract not available');
        setEstimatedAmount2(false);
        return;
      }
      
      const TokenAmountInWei = ethers.parseEther(token1Amount);

      try {
        const rate = await PRICE_CONTRACT.estimate(
          token1Address,
          token2Address,
          TokenAmountInWei
        );
      
        const f_rate: any = ethers.formatEther(rate);

        const swapFee = (20 / 1000) * f_rate;
      

        const amountTwoToReceive = f_rate - swapFee
        const roundedAmount = parseFloat(amountTwoToReceive.toFixed(9));
        
        setToken2Amount(roundedAmount);
        setAmountOneInWei(TokenAmountInWei.toString());
        ///======  ESTIMATING TWO TO ONE =====//
        
        const Amount2InWei= ethers.parseEther("1");
        const rateToExchangeTwotoOne= await PRICE_CONTRACT.estimate(
          token2Address,
          token1Address,
          Amount2InWei

        )
        const formattedTwoRate = ethers.formatEther(rateToExchangeTwotoOne);

        setBaseTwoRate(formattedTwoRate)
        
        setAmountTwoRate(rateToExchangeTwotoOne.toString());
        
      } catch (error) {
        console.error(error);
        setToken2Amount(null);
      } finally {
        setEstimatedAmount2(false);
      }
    } else {
      // If amount1 is null, set amount2 to null
      setToken2Amount(null);
      setEstimatedAmount2(false);
    }
  };
  
  useEffect(() => {
    calculateAmount2();
  }, [SWAP_CONTRACT_INSTANCE,PRICEAPI_CONTRACT_INSTANCE,token1Amount,fromToken, toToken,baseTwoRate,setAmountOneInWei,setBaseTwoRate,setToken2Amount, setAmountTwoRate, setEstimatedAmount2]);

  const estimate = (e) => {
    const newValue = e.target.value;
    setToken1Amount(newValue);
  
  
    if (newValue !== token1Amount) {
      calculateAmount2();
    }
  };


  const ApproveTokenOne=async()=>{
    
      try{
        const TEST_TOKEN_CONTRACT= await TEST_TOKEN_CONTRACT_INSTANCE(token1Address);  
       const approveSpending =await TEST_TOKEN_CONTRACT.approve(CONTRACT_ADDRESSES.swapAddress,AmountOneInWei); 
       console.log(`Loading - ${approveSpending.hash}`);
       setApproveOne(true)
        await approveSpending.wait();
      console.log(`Success - ${approveSpending.hash}`);
      setApproveOne(false)
      setHasApprovedOne(true)
      }catch(error){
       setApproveOne(false)
       console.log(error)
      }

   
   
   }


  const exchangeRates = {
    'ETH-AFRC': 2150,
    'USDC-AFRC': 1.00,
    'AFRC-ETH': 0.000465,
    'AFRC-USDC': 1.00,
    'ETH-USDC': 2150,
    'USDC-ETH': 0.000465,
  };



   const SwapToken=async()=>{
    
    if(fromToken == 'ETH'){
      try{
        const SWAP_CONTRACT= await SWAP_CONTRACT_INSTANCE();  
       const SWAP =await SWAP_CONTRACT.swap(token1Address,token2Address,AmountOneInWei,{
            value: AmountOneInWei
       }); 
       console.log(`Loading - ${SWAP.hash}`);
       setSwapping(true)
        await SWAP.wait();
      console.log(`Success - ${SWAP.hash}`);
      setSwapping(false)
      setHasApprovedOne(false)
      setApproveOne(false)
      setToken1Amount(null)
      setToken2Amount(null)
     
      }catch(error){
       setSwapping(false)
           setHasApprovedOne(false)
      setApproveOne(false)
      setToken1Amount(null)
      setToken2Amount(null)
       console.log(error)
      }
     }else if(toToken == 'ETH' ){
      try{
        const SWAP_CONTRACT= await SWAP_CONTRACT_INSTANCE();  
       const SWAP =await SWAP_CONTRACT.swap(token1Address,token2Address,AmountOneInWei); 
       console.log(`Loading - ${SWAP.hash}`);
       setSwapping(true)
        await SWAP.wait();
      console.log(`Success - ${SWAP.hash}`);
      setSwapping(false)
          setHasApprovedOne(false)
      setApproveOne(false)
      setToken1Amount(null)
      setToken2Amount(null)
      }catch(error){
       setSwapping(false)
           setHasApprovedOne(false)
      setApproveOne(false)
      setToken1Amount(null)
      setToken2Amount(null)
       console.log(error)
      } 


     }else{
      try{
        const SWAP_CONTRACT= await SWAP_CONTRACT_INSTANCE();  
       const SWAP =await SWAP_CONTRACT.swap(token1Address,token2Address,AmountOneInWei); 
       console.log(`Loading - ${SWAP.hash}`);
       setSwapping(true)
        await SWAP.wait();
      console.log(`Success - ${SWAP.hash}`);
      setSwapping(false)
          setHasApprovedOne(false)
      setApproveOne(false)
      setToken1Amount(null)
      setToken2Amount(null)
      }catch(error){
       setSwapping(false)
           setHasApprovedOne(false)
      setApproveOne(false)
      setToken1Amount(null)
      setToken2Amount(null)
       console.log(error)
      }

     }
    
    
   }


  const getCurrentRate = () => {
    const pair = `${fromToken}-${toToken}`;
    return exchangeRates[pair as keyof typeof exchangeRates] || 1;
  };

  const calculateToAmount = (amount: string) => {
    if (!amount) return '';
    const rate = getCurrentRate();
    return (parseFloat(amount) * rate).toFixed(6);
  };

  const handleFromAmountChange = (event) => {
    const value = event.target.value;
    setToken1Amount(value);
  };

  const swapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const getTokenBalance = (symbol: string) => {
    return tokens.find(t => t.symbol === symbol)?.balance || 0;
  };

  if (activeTab === 'liquidity') {
    return <LiquidityInterface onBackToSwap={() => setActiveTab('swap')} />;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Swap Tokens</h1>
        <p className="text-stone-600">Exchange tokens at the best rates</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-stone-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('swap')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'swap'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Swap
        </button>
        <button
          onClick={() => setActiveTab('liquidity')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
            activeTab === 'liquidity'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>Liquidity</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        {/* Settings */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-stone-800">Swap</h2>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-stone-800">Swap Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 rounded text-stone-500 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-stone-700 text-sm font-medium mb-2">
                  Slippage Tolerance
                </label>
                <div className="flex space-x-2 mb-2">
                  {[0.1, 0.5, 1.0].map(value => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        slippage === value
                          ? 'bg-terracotta text-white'
                          : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  placeholder="Custom %"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
              </div>

              <div>
                <label className="block text-stone-700 text-sm font-medium mb-2">
                  Transaction Deadline
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={deadline}
                    onChange={(e) => setDeadline(parseInt(e.target.value) || 20)}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm"
                    min="1"
                    max="4320"
                  />
                  <span className="text-stone-600 text-sm">minutes</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-700 text-sm font-medium">Auto Router</span>
                <button
                  onClick={() => setAutoRouter(!autoRouter)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    autoRouter ? 'bg-terracotta' : 'bg-stone-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    autoRouter ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* From Token */}
        <div className="bg-stone-50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-stone-600 text-sm">From</span>
            <span className="text-stone-600 text-sm">Balance: {Bal1} {fromToken}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="number"
              value={token1Amount || ''}
              onChange={handleFromAmountChange}
              placeholder="0.0"
              className="w-full sm:w-24 text-2xl font-semibold bg-transparent border-none outline-none"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <img
                src={tokens.find(t => t.symbol === fromToken)?.img || '/api/placeholder/32/32'}
                alt={fromToken}
                className="w-8 h-8 rounded-full"
              />
              <select
                value={fromToken}
                onChange={handleFromTokenChange}
                className="bg-white border border-stone-300 rounded-lg px-3 py-2 font-medium w-full sm:w-auto min-w-[120px] text-base"
              >
                <option value="">Select token</option>
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={swapTokens}
            className="p-2 bg-white border-2 border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <ArrowUpDown className="w-5 h-5 text-stone-600" />
          </button>
        </div>

        {/* To Token */}
        <div className="bg-stone-50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-stone-600 text-sm">To</span>
            <span className="text-stone-600 text-sm">Balance: {Bal2} {toToken}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="number"
              value={toAmount}
              onChange={(e) => setToAmount(e.target.value)}
              placeholder="0.0"
              className="w-full sm:w-24 text-2xl font-semibold bg-transparent border-none outline-none"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <img
                src={tokens.find(t => t.symbol === toToken)?.img || '/api/placeholder/32/32'}
                alt={toToken}
                className="w-8 h-8 rounded-full"
              />
              <select
                value={toToken}
                onChange={handleToTokenChange}
                className="bg-white border border-stone-300 rounded-lg px-3 py-2 font-medium w-full sm:w-auto min-w-[120px] text-base"
              >
                <option value="">Select token</option>
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Swap Details */}
        {token1Amount && (
          <div className="mt-6 p-4 bg-stone-50 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-4 h-4 text-stone-500" />
              <span className="text-stone-600 text-sm font-medium">Swap Details</span>
            </div>
            
            <div className="space-y-2 text-sm">
              {address && baseTwoRate &&
              <div className="flex justify-between">
                <span className="text-stone-600">Exchange Rate</span>
                <span className="font-medium">1 {toToken} = {baseTwoRate} {fromToken}</span>
              </div>
}
              <div className="flex justify-between">
                <span className="text-stone-600">Slippage Tolerance</span>
                <span className="font-medium">{slippage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Network Fee</span>
                <span className="font-medium">~$0.001</span>
              </div>
              {isConnected &&   <>
              <div className="flex justify-between">
                <span className="text-stone-600">Minimum Received</span>
                <span className="font-medium">{(parseFloat(token2Amount) * (1 - slippage / 100)).toFixed(6)} {toToken}</span>
              </div>
              </>}
            </div>
          </div>
        )}

         {/* Approve Button */}

          {fromToken != 'ETH' && (
        <button
        onClick={ApproveTokenOne}
         disabled={isApproveOne || hasApprovedOne || !token1Amount}
          className="w-full mt-6 bg-gradient-to-r from-terracotta to-sage text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
         {isApproveOne ? 'Approving...' : 
             hasApprovedOne ? '✓ Approved' : 
             `Approve ${fromToken}`}
        </button>
          )}

        {/* Swap Button */}
<button
  onClick={SwapToken}
  disabled={
    !isConnected ||
    !token1Amount ||
    parseFloat(token1Amount) <= 0 ||
    isSwapping ||
    (fromToken !== 'ETH' && !hasApprovedOne)
  }
  className="w-full mt-6 bg-gradient-to-r from-terracotta to-sage text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {!isConnected
    ? 'Connect Wallet'
    : isSwapping
    ? 'Swapping...'
    : !token1Amount
    ? 'Enter amount'
    : fromToken !== 'ETH' && !hasApprovedOne
    ? `Approve ${fromToken} First`
    : 'Swap Tokens'}
</button>



      </div>

      {/* Exchange Rate Widget */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-3">Live Exchange Rates</h3>
  {isConnected && (<div className="space-y-2">
      {Object.entries(poolPrices).map(([pool, price]) => (
        <div key={pool} className="flex justify-between items-center">
          <span className="text-stone-600">{pool}</span>
          <span className="font-medium">{price}</span>
        </div>
      ))}
    </div>
  )}

      </div>
    </div>
  );
};

export default SwapInterface;