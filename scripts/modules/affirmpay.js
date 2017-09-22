define(['modules/jquery-mozu',
        "modules/api",
        'hyprlivecontext',
        'underscore'],
        function($, Api, hyprlivecontext, _) {
    var AffirmPay = {
        publicApiKey : "",
        financialApiKey : "",
        isInit: false,
        isEnabled: false,
        isScriptLoaded: false,
        defaultPromoId: '',
        promoId: '',
        threshold: 0,
        financingProgram: false, // old admin props, background compatibility
        isSandbox: true,
        checkoutItemsQty: 10000, // max qty of items present in the order
        currencyCodeEnable: 'USD',
        messageCartDisabled: "Monthly Payments with <span class='affirm-logo-local color f-12'>Affirm</span> on carts with only one item ${0}+",
        messageCheckoutSelected: "Continuing will take you to the Review Order page. You will then be redirected to Affirm to securely complete your purchase.",
        messageCheckoutDisabled: "Monthly Payments with <span class='affirm-logo-local color f-14'>Affirm</span> for single-item carts ${0}+",
        messageReviewSelected: "You will be redirected to Affirm to securely complete your purchase. It's quick and easy--get a real-time decision!",
        scriptUrl: 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js',
        // Multiple Financing Program values
        mfpEnabled: true,
        mfpLoaded: false,
        mfpConfig: false,
        init: function() {
            var paymentSettings = _.findWhere( hyprlivecontext.locals.siteContext.checkoutSettings.externalPaymentWorkflowSettings, { "name" : "PayWithAffirm" } );

            if ( !paymentSettings || !paymentSettings.isEnabled ) return;
            this.publicApiKey = this.getValue(paymentSettings, "publicapikey");
            // check if module is enabled and the affirmConfig is also enabled OR if it has the queryString param in the URL affirm.test=true
            this.isEnabled = ( paymentSettings.isEnabled && this.isCustomEnabled( paymentSettings ) );
            this.promoId = this.getValue(paymentSettings, "promoId");
            this.defaultPromoId = this.promoId;
            this.threshold = this.getValue(paymentSettings, "threshold") || this.threshold;
            this.financingProgram = this.getValue(paymentSettings, "financingProgram");
            var environment = this.getValue(paymentSettings, "environment");
            this.isSandbox = environment == "sandbox";
            this.scriptUrl = ( this.isSandbox ) ? 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js' : 'https://cdn1.affirm.com/js/v2/affirm.js';
            this.isInit = true;
            this.messageCartDisabled = this.getValue(paymentSettings, "messageCartDisabled") || this.messageCartDisabled;
            this.messageCheckoutSelected = this.getValue(paymentSettings, "messageCheckoutSelected") || this.messageCheckoutSelected;
            this.messageCheckoutDisabled = this.getValue(paymentSettings, "messageCheckoutDisabled") || this.messageCheckoutDisabled;
            this.messageReviewSelected = this.getValue(paymentSettings, "messageReviewSelected") || this.messageReviewSelected;
            this.hideOrShowAffirmElements();
        },
        isCustomEnabled: function( paymentSettings ){
            var customEnabledValue = this.getValue( paymentSettings, 'affirmEnabled' );
            if( !customEnabledValue || customEnabledValue === 'No' ){
                return false;
            }
            else if( customEnabledValue === 'Yes' ) {
                return true;
            }
            else{
                var ABTestValue = this.getQueryStringParam( 'affirm.test' );
                // first check if shoud we turn off Affirm explicitly
                if( ABTestValue === 'false' || ABTestValue === '0' ) {
                    sessionStorage.setItem( 'affirm.test', null );
                    console.log( 'turning OFF affirm.test');
                    return false;
                }

                if( ( ABTestValue === 'true' || ABTestValue === '1' ) ||
                    ( sessionStorage.getItem( 'affirm.test' ) === 'true' || sessionStorage.getItem( 'affirm.test' ) === '1' ) ){
                    sessionStorage.setItem( 'affirm.test', 'true' );
                    console.log( 'turning ON affirm.test');
                    return true;
                }
                else{
                    console.log( 'affirm.test disabled');
                    return false;
                }
            }
        },
        loadMfpConfig: function( mfpCallback ){
            var self = this;
            //$.getJSON( '../../resources/Affirm_MFP.json', function( data ) {
            $.getJSON( "https://affirm-demo.com/poc/mozu/mfp.php", function( data ) {
                self.mfpConfig = data;
                self.mfpLoaded = true;
                if( mfpCallback ){
                    mfpCallback();
                }
            })
            .fail(function() {
                console.log( "Error loading affirm MFP file config" );
                self.mfpLoaded = false;
                self.mfpEnabled = false;
                if( mfpCallback ){
                    mfpCallback();
                }
            });
        },
        load: function( affirmConfigLoadedinitCallback, scriptLoadedCallback, mfpCallback ){

            if( !this.isInit ){
                this.init();
            }
            if( this.mfpEnabled && !this.mfpLoaded ){
                this.loadMfpConfig( mfpCallback );
            }
            if( affirmConfigLoadedinitCallback ) affirmConfigLoadedinitCallback();

            window.sandbox = (this.isSandbox ? "/sandbox" : "");

            var _affirm_config = {
                public_api_key:  this.publicApiKey,
                script:          this.scriptUrl
            };
            window._affirm_config = _affirm_config || window._affirm_config;

            var self = this;

            var successLoading = function(){
                self.isScriptLoaded = true;

                (function(l,g,m,e,a,f,b){
                    var d,c=l[m]||{},h=document.createElement(f),n=document.getElementsByTagName(f)[0],k=function(a,b,c){
                        return function(){
                            a[b]._.push([c,arguments]);
                        };
                    };c[e]=k(c,e,"set");d=c[e];c[a]={};c[a]._=[];d._=[];c[a][b]=k(c,a,b);a=0;for(b="set add save post open empty reset on off trigger ready setProduct".split(" ");a<b.length;a++)d[b[a]]=k(c,e,b[a]);a=0;var x=function(){};for(b=["get","token","url","items"];a<b.length;a++)d[b[a]]=x;h.async=!0;h.src=g[f];n.parentNode.insertBefore(h,n);delete g[f];d(g);l[m]=c;}
                )(window,_affirm_config,"affirm","checkout","ui","script","ready");

                if( scriptLoadedCallback ) scriptLoadedCallback();
            };

            if( !this.isScriptLoaded ){
                $.getScript(_affirm_config.script).done( successLoading ).fail( function( jqxhr, settings, exception ) {
                    self.isScriptLoaded = false;
                });
            }
            else{
                successLoading();
            }
        },
        getQueryStringParam: function( key ) {
            key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
            var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
            return match && decodeURIComponent(match[1].replace(/\+/g, " "));
        },
        getValue: function(paymentSetting, key) {
            var value = _.findWhere(paymentSetting.credentials, {"apiName" : key});

            if (!value)
            return;
            return value.value;
        },

        refresh: function(){
            if( window.affirm && typeof window.affirm.ui.refresh === 'function' ) {
                window.affirm.ui.refresh();
            }
            this.hideOrShowAffirmElements();
        },

        hideOrShowAffirmElements: function(){
            if( this.isEnabled ){
                $( '.affirm-components ').show();
            }
            else{
                $( '.affirm-components' ).hide();
            }
        },
        getLabel: function ( label, replacementArray ) {
            for ( var c = label, d = replacementArray, e = 0, f = d.length; f > e; e++ ){
                return c.split("{" + e + "}").join(d[e] || "");
            }
        },
        getProductMFP: function( itemSku, isUniqueItemInCart ){
            var returnMFP = false;
            if( this.mfpConfig && this.mfpConfig.productLevelMFP ){
                // look for this poduct into the MFP product level
                var selectedMFP = _.filter( this.mfpConfig.productLevelMFP, function( plans ) {
                    return plans.enabled && _.find( plans.skus, function( item ) {
                        return item == itemSku;
                    });
                });
                if( selectedMFP && selectedMFP.length > 0 ){
                    selectedMFP.forEach( function( candidateMFP ) {
                        var isValidMFP = false;
                        if( candidateMFP.mfpInclusiveType || ( !candidateMFP.mfpInclusiveType && isUniqueItemInCart ) ){
                            // is inclusive or its alone in the cart
                            isValidMFP = true;

                            //check dates (optional)
                            if( candidateMFP.startDate && candidateMFP.endDate ){
                                var startDate = new Date( candidateMFP.startDate );
                                var endDate = new Date( candidateMFP.endDate );
                                var now = new Date();
                                if( !isNaN( startDate ) && !isNaN( endDate ) ){
                                    // use valid date to validate MFP
                                    isValidMFP = (startDate <= now && now <= endDate);
                                }
                                else{
                                    console.log( 'Affirm MFP invalid Dates for:', selectedMFP);
                                }
                            }

                            // check priority (optional)
                            if( candidateMFP.priority ){
                                // check priority vs others mfp
                                if( returnMFP && returnMFP.priority ){
                                    isValidMFP = ( candidateMFP.priority < returnMFP.priority );
                                }
                            }
                            else if ( returnMFP && returnMFP.priority ){ // current doesnt have priority set, so check if previous MFP have priority set
                                isValidMFP = false;
                            }

                        }

                        // set the candidate MFP to return
                        returnMFP = ( isValidMFP ) ? candidateMFP : returnMFP;
                    } );
                }
            }
            return returnMFP;
        },
        getCategoryMFP: function( itemCategories, isUniqueItemInCart ){
            var returnMFP = false;
            var mfpMatches = [];
            if( this.mfpConfig && this.mfpConfig.categoryLevelMFP){
                var self = this;
                // iterate all over the categories where the product is
                itemCategories.forEach( function( category ){
                    // look for this poduct into the MFP product level
                    var selectedMFP = _.filter( self.mfpConfig.categoryLevelMFP, function( plans ) {
                        return plans.enabled && _.find( plans.categoryCodes, function( item ) {
                            return item == category.id;
                        });
                    });

                    if( selectedMFP && selectedMFP.length > 0 ){
                        selectedMFP.forEach( function( candidateMFP ) {
                            var isValidMFP = false;
                            if( candidateMFP.mfpInclusiveType || ( !candidateMFP.mfpInclusiveType && isUniqueItemInCart ) ){
                                // is inclusive or its alone in the cart
                                isValidMFP = true;

                                //check dates (optional)
                                if( candidateMFP.startDate && candidateMFP.endDate ){
                                    var startDate = new Date( candidateMFP.startDate );
                                    var endDate = new Date( candidateMFP.endDate );
                                    var now = new Date();
                                    if( !isNaN( startDate ) && !isNaN( endDate ) ){
                                        // use valid date to validate MFP
                                        isValidMFP = (startDate <= now && now <= endDate);
                                    }
                                    else{
                                        console.log( 'Affirm MFP invalid Dates for:', selectedMFP);
                                    }
                                }

                                // check priority (optional)
                                if( candidateMFP.priority ){
                                    // check priority vs others mfp
                                    if( returnMFP && returnMFP.priority ){
                                        isValidMFP = ( candidateMFP.priority < returnMFP.priority );
                                    }
                                }
                                else if ( returnMFP && returnMFP.priority ){ // current doesnt have priority set, so check if previous MFP have priority set
                                    isValidMFP = false;
                                }

                            }

                            // set the candidate MFP to return
                            if( isValidMFP ){
                                returnMFP = candidateMFP;
                                mfpMatches.push( candidateMFP );
                            }
                        } );
                    }
                });
            }
            return returnMFP;
        },
        getCartSizeMFP: function( orderTotal ){
            if( this.mfpConfig && this.mfpConfig.cartSizeMFP  && this.mfpConfig.cartSizeMFP.enabled ){
                var mfpMatches = this.mfpConfig.cartSizeMFP;

                if( mfpMatches.minOrderTotal &&
                    !isNaN( mfpMatches.minOrderTotal) &&
                    mfpMatches.maxOrderTotal &&
                    !isNaN( mfpMatches.maxOrderTotal) &&
                    ( mfpMatches.minOrderTotal <= orderTotal && orderTotal <= mfpMatches.maxOrderTotal ) ){
                    return mfpMatches;
                }
            }
            return false;
        },
        getSiteLevelMFP: function(){
            var returnMFP = false;
            if( this.mfpConfig && this.mfpConfig.siteLevelMFP ){
                var mfpMatches = _.filter( this.mfpConfig.siteLevelMFP, function( plans ) {
                    return plans.enabled;
                });
                if( mfpMatches && mfpMatches.length > 0 ){
                    mfpMatches.forEach( function( matchMFP ) {
                        if( matchMFP.startDate && matchMFP.endDate ){
                            var startDate = new Date( matchMFP.startDate );
                            var endDate = new Date( matchMFP.endDate );
                            var now = new Date();
                            if( !isNaN( startDate ) && !isNaN( endDate ) && (startDate <= now && now <= endDate) ){
                                returnMFP = matchMFP;
                            }
                        }
                    });
                }
            }
            return returnMFP;
        },
        getDefaultMFP: function(){
            if( this.mfpConfig && this.mfpConfig.defaultMFP  && this.mfpConfig.defaultMFP !== '' ){
                return { mfpValue: this.mfpConfig.defaultMFP, promoId: '' };
            }
            return false;
        },
        getProductPageMFP: function( itemSku, cats, orderTotal ){
            try{
                if( this.mfpEnabled && this.mfpConfig ){
                    var items = [ itemSku ];
                    var catsPerItems = _.pluck( cats, 'categoryId');
                    catsPerItems = _.map( catsPerItems, function( elem, index ) {
                        return { id: elem };
                    });
                    catsPerItems = [ catsPerItems ];
                    // organize item->categories info
                    var globalItems = _.map( items, function( elem, index ){
                        return { item: elem, cats: catsPerItems[ index ] };
                    });
                    var mfp =  this.getMFP( orderTotal, globalItems, 1 );
                    this.promoId = mfp.promoId || this.defaultPromoId;
                    this.financingProgram = mfp.mfpValue;
                    return mfp;
                }
                return false;
            }
            catch ( error ) {
                console.error( 'Affirm MFP fail', error );
                return false;
            }
        },
        getCartPageMFP: function( orderTotal, itemsInCart ){
            try{
                if( this.mfpEnabled &&this.mfpConfig ){
                    var items = _.pluck(_.pluck(_.pluck(_.pluck( itemsInCart.models, 'attributes'), 'product'), 'attributes') , 'productCode');
                    var catsPerItems = _.pluck(_.pluck(_.pluck(_.pluck( itemsInCart.models, 'attributes'), 'product'), 'attributes'), 'categories');
                    // organize item->categories info
                    var globalItems = _.map( items, function( elem, index ){
                        return { item: elem, cats: catsPerItems[ index ] };
                    });
                    var mfp = this.getMFP( orderTotal, globalItems, itemsInCart.length );
                    this.promoId = mfp.promoId || this.defaultPromoId;
                    this.financingProgram = mfp.mfpValue;
                    return mfp;
                }
                return false;
            }
            catch ( error ) {
                console.error( 'Affirm MFP fail', error );
                return false;
            }
        },
        getCheckoutPageMFP: function( orderTotal, itemsInCart ){
            try{
                if( this.mfpEnabled && this.mfpConfig ){
                    var items = _.pluck(_.pluck( itemsInCart, 'product'), 'productCode');
                    var catsPerItems = _.pluck(_.pluck( itemsInCart, 'product'), 'categories');
                    // organize item->categories info
                    var globalItems = _.map( items, function( elem, index ){
                        return { item: elem, cats: catsPerItems[ index ] };
                    });
                    var mfp = this.getMFP( orderTotal, globalItems, itemsInCart.length );
                    this.promoId = mfp.promoId || this.defaultPromoId;
                    this.financingProgram = mfp.mfpValue;
                    return mfp;
                }
                return false;
            }
            catch ( error ) {
                console.error( 'Affirm MFP fail', error );
                return false;
            }
        },
        getMFP: function( orderTotal, globalItems, cartLenght ){
            try {
                var self = this;
                var mfpMatch = false;
                var mfpMatches = [];
                // remove repeated items in the cart
                globalItems = globalItems.filter( function( elem, index, selfArray ) {
                    return index == _.pluck( selfArray, 'item').indexOf( elem.item );
                });

                // get PRODUCT LEVEL MFP
                globalItems.forEach( function( itemInCart ) {
                    // TODO: look for exclusive diff produc in cart (what happen for 3 prod of the same type)
                    mfpMatch = self.getProductMFP( itemInCart.item, ( cartLenght == 1 ) );
                    if( mfpMatch ){
                        mfpMatches.push( mfpMatch );
                    }
                });
                if( mfpMatches && mfpMatches.length > 0 ){
                    // get the lowest priority plan, assigning hight values to those that doesnt have it set
                    return _.min( mfpMatches, function( plan ){ return ( plan.priority ) ? plan.priority : 99999;});
                }

                // get CATEGORY LEVEL MFP
                globalItems.forEach( function( itemInCart ) {
                    // TODO: look for exclusive diff produc in cart (what happen for 3 prod of the same type)
                    var mfpMatch = self.getCategoryMFP( itemInCart.cats, ( cartLenght == 1 ) );
                    if( mfpMatch ){
                        mfpMatches.push( mfpMatch );
                    }
                });

                if( mfpMatches && mfpMatches.length > 0 ){
                    // get the lowest priority plan, assigning hight values to those that doesnt have it set
                    return _.min( mfpMatches, function( plan ){ return ( plan.priority ) ? plan.priority : 99999;});
                }

                // get CART SIZE LEVEL MFP
                mfpMatch = self.getCartSizeMFP( orderTotal );
                if( mfpMatch ){
                    return mfpMatch;
                }

                // get SITE LEVEL MFP
                mfpMatch = self.getSiteLevelMFP();
                if( mfpMatch ){
                    return mfpMatch;
                }

                // get DEFAULT MFP
                mfpMatch = self.getDefaultMFP();
                if( mfpMatch ){
                    return mfpMatch;
                }
                return false;
            } catch ( error ) {
                console.error( 'Affirm MFP fail', error );
                return false;
            }
        }
	};
	return AffirmPay;

});
