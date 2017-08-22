require( [ 'modules/jquery-mozu', 'hyprlive', 'modules/affirmpay' ],
function ( $, Hypr, AffirmPay ) {

    var affirmCallback = function(){
        if( AffirmPay.isEnabled ){
            $( '.affirm-site-modal-link-wrapper' ).each( function(){
                $( this ).append( $('<a/>', {
                    'class': 'affirm-site-modal',
                    'data-promo-id': AffirmPay.promoId
                }).html( Hypr.getLabel( 'affirmWidgetLink' ) ) );
            });
            $( '.affirm-promotions-banner' ).show();
        }
    };

    // init Affirm Payment Promotional message
    AffirmPay.load( affirmCallback );
});
