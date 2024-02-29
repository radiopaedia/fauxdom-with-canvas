const {DOM} = require( "./utils" );

describe( "Check EventTarget listener manipulation", () =>
{
    const funOutput = [];

    const fun1 = function fun1() { funOutput.push(1) };
    const fun2 = function fun2() { funOutput.push(2) };
    const fun3 = function fun3() { funOutput.push(3) };

    test( "Add event listeners", () =>
    {
        let document = new DOM( "<!DOCTYPE html><html><head></head><body><div></div></body></html>" );
        funOutput.length = 0;

        document.addEventListener('the_event', fun1);
        document.addEventListener('the_event', fun2, true);
        document.addEventListener('the_event', fun3, { capture: false });

        document.dispatchEvent(new Event('the_event'));

        expect( funOutput ).toEqual( [1,2,3] );
    } );

    test( "Dispatch picks the right event", () =>
    {
        let document = new DOM( "<!DOCTYPE html><html><head></head><body><div></div></body></html>" );
        funOutput.length = 0;

        document.addEventListener('the_event', fun1);
        document.addEventListener('the_event', fun2);

        document.dispatchEvent(new Event('not_event'));

        // Stays empty
        expect( funOutput.length ).toBe( 0 );
    } );

    test( "Capturing affects which listeners are removed", () =>
    {
        let document = new DOM( "<!DOCTYPE html><html><head></head><body><div></div></body></html>" );
        funOutput.length = 0;

        document.addEventListener('the_event', fun2);
        document.addEventListener('the_event', fun2, true);
        document.addEventListener('the_event', fun2, { capture: false });
        document.addEventListener('the_event', fun2, false);

        // Should only remove one listener
        document.removeEventListener('the_event', fun2, true);

        document.dispatchEvent(new Event('the_event'));

        expect( funOutput ).toEqual( [2,2,2] );
    } );
} );
