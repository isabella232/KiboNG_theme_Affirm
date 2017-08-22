define( [
    'modules/backbone-mozu',
    'underscore',
    'modules/jquery-mozu',
    'modules/models-cart',
    'modules/cart-monitor',
    'hyprlivecontext',
    'hyprlive',
    'modules/preserve-element-through-render',
    'modules/affirmpay'], function (
        Backbone,
        _,
        $,
        CartModels,
        CartMonitor,
        HyprLiveContext,
        Hypr,
        preserveElement,
        AffirmPay
    ) {
    var CartView = Backbone.MozuView.extend({
        templateName: "modules/cart/cart-table",
        initialize: function () {
            var me = this;

            //setup coupon code text box enter.
            this.listenTo(this.model, 'change:couponCode', this.onEnterCouponCode, this);
            this.codeEntered = !!this.model.get('couponCode');
            this.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    if (me.codeEntered) {
                        me.handleEnterKey();
                    }
                    return false;
                }
            });

            this.listenTo(this.model.get('items'), 'quantityupdatefailed', this.onQuantityUpdateFailed, this);

            var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
            var pageContext = require.mozuData('pagecontext');
            if (visaCheckoutSettings.isEnabled) {
                window.onVisaCheckoutReady = initVisaCheckout;
                require([pageContext.visaCheckoutJavaScriptSdkUrl], initVisaCheckout);
            }
        },
        render: function() {
            preserveElement(this, ['.v-button'], function() {
                Backbone.MozuView.prototype.render.call(this);
            });

            // get total qty of individual items in the cart
            var itemsQtyTotal = 0;
            this.model.get( 'items' ).forEach( function( item ) { itemsQtyTotal += item.get( 'quantity' ); } );

            // refresh Affirm messages
            reloadAffirm( this.model.get('total'), itemsQtyTotal, this.model.get('items') );
        },
        updateQuantity: _.debounce(function (e) {
            var $qField = $(e.currentTarget),
                newQuantity = parseInt($qField.val(), 10),
                id = $qField.data('mz-cart-item'),
                item = this.model.get("items").get(id);

            if (item && !isNaN(newQuantity)) {
                item.set('quantity', newQuantity);
                item.saveQuantity();
            }
        },400),
        onQuantityUpdateFailed: function(model, oldQuantity) {
            var field = this.$('[data-mz-cart-item=' + model.get('id') + ']');
            if (field) {
                field.val(oldQuantity);
            }
            else {
                this.render();
            }
        },
        removeItem: function(e) {
            if(require.mozuData('pagecontext').isEditMode) {
                // 65954
                // Prevents removal of test product while in editmode
                // on the cart template
                return false;
            }
            var $removeButton = $(e.currentTarget),
                id = $removeButton.data('mz-cart-item');
            this.model.removeItem(id);
            return false;
        },
        empty: function() {
            this.model.apiDel().then(function() {
                window.location.reload();
            });
        },
        proceedToCheckout: function () {
            //commenting  for ssl for now...
            //this.model.toOrder();
            // return false;
            this.model.isLoading(true);
            // the rest is done through a regular HTTP POST
        },
        addCoupon: function () {
            var self = this;
            this.model.addCoupon().ensure(function () {
                self.model.unset('couponCode');
                self.render();
            });
        },
        onEnterCouponCode: function (model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('#cart-coupon-code').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('#cart-coupon-code').prop('disabled', true);
            }
        },
        autoUpdate: [
            'couponCode'
        ],
        handleEnterKey: function () {
            this.addCoupon();
        }
    });

    /* begin visa checkout */
    function initVisaCheckout (model, subtotal) {
        var delay = 500;
        var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
        var apiKey = visaCheckoutSettings.apiKey;
        var clientId = visaCheckoutSettings.clientId;

        // if this function is being called on init rather than after updating cart total
        if (!model) {
            model = CartModels.Cart.fromCurrent();
            subtotal = model.get('subtotal');
            delay = 0;

            if (!window.V) {
                //console.warn( 'visa checkout has not been initilized properly');
                return false;
            }
            // on success, attach the encoded payment data to the window
            // then turn the cart into an order and advance to checkout
            window.V.on("payment.success", function(payment) {
                // payment here is an object, not a string. we'll stringify it later
                var $form = $('#cartform');

                _.each({

                    digitalWalletData: JSON.stringify(payment),
                    digitalWalletType: "VisaCheckout"

                }, function(value, key) {

                    $form.append($('<input />', {
                        type: 'hidden',
                        name: key,
                        value: value
                    }));

                });

                $form.submit();

            });

        }

        // delay V.init() while we wait for MozuView to re-render
        // we could probably listen for a "render" event instead
        _.delay(window.V.init, delay, {
            apikey: apiKey,
            clientId: clientId,
            paymentRequest: {
                currencyCode: model ? model.get('currencyCode') : 'USD',
                subtotal: "" + subtotal
            }
        });
    }
    /* end visa checkout */

    // Render Affirm marketing message if needed
    function renderAffirmCallback ( cartTotal, itemsQtyTotal, cartItems ) {
        $('div.shopping-cart-review-affirm-wrapper p').empty();
        if( AffirmPay.isEnabled ){
            var affirmMFP =  AffirmPay.getCartPageMFP( cartTotal, cartItems );
            if( cartTotal >= AffirmPay.threshold && itemsQtyTotal > 0 && itemsQtyTotal <= AffirmPay.checkoutItemsQty ){
                var toAffirmNumberFormat = function( num ){
                    num = ( num * 100 ).toString();
                    return ( num.indexOf('.') >= 0 && num.substr(num.indexOf('.') + 1).length > 2 ) ? Math.ceil( num ) : num;
                };

                $('div.shopping-cart-review-affirm-wrapper p').append($('<p />', {
                    'class': 'affirm-as-low-as',
                    'data-amount': toAffirmNumberFormat( cartTotal ),
                    'data-promo-id': affirmMFP.promoId || AffirmPay.promoId
                }));
            }
            else{
                $('div.shopping-cart-review-affirm-wrapper p').append($('<p class=affirm-checkout-message-over-limit> ' +
                    AffirmPay.getLabel( AffirmPay.messageCartDisabled, [AffirmPay.threshold] ) + '</p>', {
                }).append( $('<a />', {
                    'class': 'affirm-site-modal local',
                    'text': 'Learn More',
                    'data-promo-id': affirmMFP.promoId || AffirmPay.promoId
                })));
                /*<p class="affirm-checkout-message-over-limit">{{ model.affirmPaymentData.messageCheckoutDisabled|string_format(model.affirmPaymentData.threshold)|safe }}</p>
                <a class="affirm-site-modal local" data-promo-id={{ model.affirmPaymentData.promoId }}>Learn More</a>
                */
            }
            $('div.shopping-cart-review-affirm-wrapper').show();
        }
    }

    function reloadAffirm( cartTotal, itemsQtyTotal, cartItems ){
        // init Affirm Payment Promotional messaging
        renderAffirmCallback( cartTotal, itemsQtyTotal, cartItems );

        if( AffirmPay.isEnabled ){
            window.affirm.ui.refresh();
        }
    }

    $(document).ready(function() {
        var cartModel = CartModels.Cart.fromCurrent(),
            cartViews = {

                cartView: new CartView({
                    el: $('#cart'),
                    model: cartModel,
                    messagesEl: $('[data-mz-message-bar]')
                })

            };

        cartModel.on('ordercreated', function (order) {
            cartModel.isLoading(true);
            window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + '/checkout/' + order.prop('id');
        });

        cartModel.on('sync', function() {
            CartMonitor.setCount(cartModel.count());
        });

        // init Affirm Payment Promotional messaging
        var affirmWrapper = function(){
            // get total qty of individual items in the cart
            var itemsQtyTotal = 0;
            cartModel.get( 'items' ).forEach( function( item ) { itemsQtyTotal += item.get( 'quantity' ); } );
            // render affirm messages
            renderAffirmCallback( cartModel.get('total'), itemsQtyTotal, cartModel.get('items') );
        };
        AffirmPay.load( false, false, affirmWrapper );

        window.cartView = cartViews;

        CartMonitor.setCount(cartModel.count());
    });

});
