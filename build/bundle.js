
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Dove.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/Dove.svelte";

    // (103:0) {#if !isNaN(doveCorord.left)}
    function create_if_block$1(ctx) {
    	let div;
    	let div_style_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "realDove svelte-1jv9oil");

    			attr_dev(div, "style", div_style_value = `
            background-position-y: ${/*birdY*/ ctx[2]}px;
            left: ${/*doveCorord*/ ctx[0].left}px;
            top: ${/*doveCorord*/ ctx[0].top}px;
            transform: rotate(${/*angle*/ ctx[4]}deg);`);

    			add_location(div, file$1, 103, 4, 2218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[7](div);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*birdY, doveCorord*/ 5 && div_style_value !== (div_style_value = `
            background-position-y: ${/*birdY*/ ctx[2]}px;
            left: ${/*doveCorord*/ ctx[0].left}px;
            top: ${/*doveCorord*/ ctx[0].top}px;
            transform: rotate(${/*angle*/ ctx[4]}deg);`)) {
    				attr_dev(div, "style", div_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[7](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(103:0) {#if !isNaN(doveCorord.left)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let show_if = !isNaN(/*doveCorord*/ ctx[0].left);
    	let if_block_anchor;
    	let if_block = show_if && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*doveCorord*/ 1) show_if = !isNaN(/*doveCorord*/ ctx[0].left);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getRandomInt(min, max) {
    	min = Math.ceil(min);
    	max = Math.floor(max);
    	return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Dove", slots, []);
    	let { boundary } = $$props;
    	let { speed } = $$props;
    	let doveCorord = { left: null, right: null };
    	let dove;
    	const dispatch = createEventDispatcher();
    	let doveMovement;
    	let birdFlying;
    	let birdY = 0;
    	const directions = ["asc", "desc"];
    	const direction = directions[getRandomInt(0, 1)];
    	let flow = direction === "asc" ? 3 : -3;
    	let angle = direction === "asc" ? 120 : 30;

    	onMount(() => {
    		if (!boundary) {
    			console.log("no boundary");
    		}

    		$$invalidate(0, doveCorord = {
    			top: getRandomInt(0, boundary.height - 300),
    			left: -100
    		});

    		move();
    	});

    	function move(s) {
    		console.log(s, speed);
    		let counter = 0;

    		doveMovement = setInterval(
    			() => {
    				counter++;

    				if (counter % 10 === 0) {
    					$$invalidate(0, doveCorord.top = doveCorord.top + flow, doveCorord);
    					bound();
    				}

    				$$invalidate(0, doveCorord.left = doveCorord.left + 1, doveCorord);
    			},
    			speed
    		);
    	}

    	function bound() {
    		let postition = dove && dove.getBoundingClientRect();

    		if (!boundary || !postition) {
    			return;
    		}

    		if (postition.width > doveCorord.left) {
    			// dove is not even started flying
    			return;
    		}

    		const hBound = boundary.left >= postition.right || boundary.right <= postition.left;

    		if (hBound) {
    			dispatch("away");
    		}
    	}

    	function changeSpeed(updated) {
    		clearInterval(doveMovement);
    		move(updated);
    		fly();
    	}

    	onDestroy(() => {
    		clearInterval(doveMovement);
    		clearInterval(birdFlying);
    	});

    	function fly() {
    		birdFlying = setInterval(
    			() => {
    				if (birdY === 1408 - 64) {
    					$$invalidate(2, birdY = 0);
    					return;
    				}

    				$$invalidate(2, birdY = birdY + 64);
    			},
    			60
    		);
    	}

    	const writable_props = ["boundary", "speed"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Dove> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			dove = $$value;
    			$$invalidate(1, dove);
    		});
    	}

    	const click_handler = () => dispatch("shoot");

    	$$self.$$set = $$props => {
    		if ("boundary" in $$props) $$invalidate(5, boundary = $$props.boundary);
    		if ("speed" in $$props) $$invalidate(6, speed = $$props.speed);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		onMount,
    		boundary,
    		speed,
    		doveCorord,
    		dove,
    		dispatch,
    		doveMovement,
    		birdFlying,
    		birdY,
    		directions,
    		direction,
    		flow,
    		angle,
    		move,
    		bound,
    		getRandomInt,
    		changeSpeed,
    		fly
    	});

    	$$self.$inject_state = $$props => {
    		if ("boundary" in $$props) $$invalidate(5, boundary = $$props.boundary);
    		if ("speed" in $$props) $$invalidate(6, speed = $$props.speed);
    		if ("doveCorord" in $$props) $$invalidate(0, doveCorord = $$props.doveCorord);
    		if ("dove" in $$props) $$invalidate(1, dove = $$props.dove);
    		if ("doveMovement" in $$props) doveMovement = $$props.doveMovement;
    		if ("birdFlying" in $$props) birdFlying = $$props.birdFlying;
    		if ("birdY" in $$props) $$invalidate(2, birdY = $$props.birdY);
    		if ("flow" in $$props) flow = $$props.flow;
    		if ("angle" in $$props) $$invalidate(4, angle = $$props.angle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*speed*/ 64) {
    			changeSpeed(speed);
    		}
    	};

    	return [
    		doveCorord,
    		dove,
    		birdY,
    		dispatch,
    		angle,
    		boundary,
    		speed,
    		div_binding,
    		click_handler
    	];
    }

    class Dove extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { boundary: 5, speed: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dove",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*boundary*/ ctx[5] === undefined && !("boundary" in props)) {
    			console_1.warn("<Dove> was created without expected prop 'boundary'");
    		}

    		if (/*speed*/ ctx[6] === undefined && !("speed" in props)) {
    			console_1.warn("<Dove> was created without expected prop 'speed'");
    		}
    	}

    	get boundary() {
    		throw new Error("<Dove>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set boundary(value) {
    		throw new Error("<Dove>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get speed() {
    		throw new Error("<Dove>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set speed(value) {
    		throw new Error("<Dove>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */
    const file = "src/App.svelte";

    // (147:2) {#if acheived}
    function create_if_block_5(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let if_block = /*acheived*/ ctx[0] !== 1 && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("you have shot ");
    			t1 = text(/*acheived*/ ctx[0]);
    			t2 = text(" dove");
    			if (if_block) if_block.c();
    			t3 = text("!");
    			attr_dev(div, "class", "score svelte-1a7yj49");
    			add_location(div, file, 146, 17, 2255);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*acheived*/ 1) set_data_dev(t1, /*acheived*/ ctx[0]);

    			if (/*acheived*/ ctx[0] !== 1) {
    				if (if_block) ; else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(div, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(147:2) {#if acheived}",
    		ctx
    	});

    	return block;
    }

    // (147:65) {#if acheived !== 1}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("s");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(147:65) {#if acheived !== 1}",
    		ctx
    	});

    	return block;
    }

    // (148:2) {#if away}
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let if_block = /*away*/ ctx[1] !== 1 && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(/*away*/ ctx[1]);
    			t1 = text(" dove");
    			if (if_block) if_block.c();
    			t2 = text(" have gone already!");
    			attr_dev(div, "class", "away svelte-1a7yj49");
    			add_location(div, file, 147, 13, 2356);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*away*/ 2) set_data_dev(t0, /*away*/ ctx[1]);

    			if (/*away*/ ctx[1] !== 1) {
    				if (if_block) ; else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(div, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(148:2) {#if away}",
    		ctx
    	});

    	return block;
    }

    // (148:42) {#if away !== 1}
    function create_if_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("s");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(148:42) {#if away !== 1}",
    		ctx
    	});

    	return block;
    }

    // (155:2) {:else }
    function create_else_block_1(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Start";
    			attr_dev(div, "class", "start svelte-1a7yj49");
    			add_location(div, file, 155, 3, 2700);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleStart*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(155:2) {:else }",
    		ctx
    	});

    	return block;
    }

    // (149:2) {#if  start}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*speed*/ ctx[5] > 0 && /*away*/ ctx[1] < 3) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(149:2) {#if  start}",
    		ctx
    	});

    	return block;
    }

    // (152:3) {:else }
    function create_else_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "GAME OVER";
    			attr_dev(div, "class", "completed svelte-1a7yj49");
    			add_location(div, file, 152, 4, 2638);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(152:3) {:else }",
    		ctx
    	});

    	return block;
    }

    // (150:3) {#if speed > 0 && away < 3}
    function create_if_block_1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*isDoveActive*/ ctx[2] && /*boundary*/ ctx[8] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*isDoveActive*/ ctx[2] && /*boundary*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isDoveActive, boundary*/ 260) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(150:3) {#if speed > 0 && away < 3}",
    		ctx
    	});

    	return block;
    }

    // (151:4) {#if isDoveActive && boundary}
    function create_if_block_2(ctx) {
    	let dove;
    	let updating_boundary;
    	let updating_speed;
    	let current;

    	function dove_boundary_binding(value) {
    		/*dove_boundary_binding*/ ctx[12](value);
    	}

    	function dove_speed_binding(value) {
    		/*dove_speed_binding*/ ctx[13](value);
    	}

    	let dove_props = {};

    	if (/*boundary*/ ctx[8] !== void 0) {
    		dove_props.boundary = /*boundary*/ ctx[8];
    	}

    	if (/*speed*/ ctx[5] !== void 0) {
    		dove_props.speed = /*speed*/ ctx[5];
    	}

    	dove = new Dove({ props: dove_props, $$inline: true });
    	binding_callbacks.push(() => bind(dove, "boundary", dove_boundary_binding));
    	binding_callbacks.push(() => bind(dove, "speed", dove_speed_binding));
    	dove.$on("shoot", /*handleShoot*/ ctx[9]);
    	dove.$on("away", /*handleAway*/ ctx[10]);

    	const block = {
    		c: function create() {
    			create_component(dove.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dove, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dove_changes = {};

    			if (!updating_boundary && dirty & /*boundary*/ 256) {
    				updating_boundary = true;
    				dove_changes.boundary = /*boundary*/ ctx[8];
    				add_flush_callback(() => updating_boundary = false);
    			}

    			if (!updating_speed && dirty & /*speed*/ 32) {
    				updating_speed = true;
    				dove_changes.speed = /*speed*/ ctx[5];
    				add_flush_callback(() => updating_speed = false);
    			}

    			dove.$set(dove_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dove.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dove.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dove, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(151:4) {#if isDoveActive && boundary}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current_block_type_index;
    	let if_block2;
    	let current;
    	let if_block0 = /*acheived*/ ctx[0] && create_if_block_5(ctx);
    	let if_block1 = /*away*/ ctx[1] && create_if_block_3(ctx);
    	const if_block_creators = [create_if_block, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*start*/ ctx[6]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(/*timer*/ ctx[3]);
    			t1 = text(" level: ");
    			t2 = text(/*level*/ ctx[4]);
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if_block2.c();
    			attr_dev(div0, "class", "time svelte-1a7yj49");
    			add_location(div0, file, 145, 2, 2189);
    			attr_dev(div1, "id", "box");
    			attr_dev(div1, "class", "box target-cursor svelte-1a7yj49");
    			add_location(div1, file, 143, 1, 2127);
    			attr_dev(div2, "class", "wrap svelte-1a7yj49");
    			add_location(div2, file, 142, 0, 2107);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div1, t3);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t5);
    			if_blocks[current_block_type_index].m(div1, null);
    			/*div1_binding*/ ctx[14](div1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*timer*/ 8) set_data_dev(t0, /*timer*/ ctx[3]);
    			if (!current || dirty & /*level*/ 16) set_data_dev(t2, /*level*/ ctx[4]);

    			if (/*acheived*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div1, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*away*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div1, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block2 = if_blocks[current_block_type_index];

    				if (!if_block2) {
    					if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block2.c();
    				} else {
    					if_block2.p(ctx, dirty);
    				}

    				transition_in(if_block2, 1);
    				if_block2.m(div1, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_blocks[current_block_type_index].d();
    			/*div1_binding*/ ctx[14](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const lap = 30;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let acheived = 0;
    	let away = 0;
    	let isDoveActive = true;
    	let time = 0;
    	let timer = "00:00:00";
    	let level = 1;
    	let speed = 15;
    	let interval;
    	let start = false;

    	function handleShoot() {
    		$$invalidate(0, acheived++, acheived);
    		renderNewDove();
    	}

    	function renderNewDove() {
    		$$invalidate(2, isDoveActive = false);

    		setTimeout(
    			() => {
    				$$invalidate(2, isDoveActive = true);
    			},
    			1000
    		);
    	}

    	let box;
    	let boundary;

    	onMount(() => {
    		$$invalidate(8, boundary = box && box.getBoundingClientRect());
    	});

    	function handleAway() {
    		$$invalidate(1, away++, away);

    		if (away > 2) {
    			doGameOver();
    			return;
    		}

    		renderNewDove();
    	}

    	function doGameOver() {
    		clearInterval(interval);
    	}

    	function startGame() {
    		interval = setInterval(
    			() => {
    				time++;
    				$$invalidate(3, timer = new Date(time * 1000).toISOString().substr(11, 8));

    				if (time % lap === 0) {
    					$$invalidate(4, level++, level);

    					if (speed !== 0) {
    						$$invalidate(5, speed--, speed);
    					} else {
    						doGameOver();
    					}
    				}
    			},
    			1000
    		);
    	}

    	function handleStart() {
    		$$invalidate(6, start = true);
    		startGame();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function dove_boundary_binding(value) {
    		boundary = value;
    		$$invalidate(8, boundary);
    	}

    	function dove_speed_binding(value) {
    		speed = value;
    		$$invalidate(5, speed);
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			box = $$value;
    			$$invalidate(7, box);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Dove,
    		acheived,
    		away,
    		isDoveActive,
    		time,
    		timer,
    		level,
    		speed,
    		interval,
    		lap,
    		start,
    		handleShoot,
    		renderNewDove,
    		box,
    		boundary,
    		handleAway,
    		doGameOver,
    		startGame,
    		handleStart
    	});

    	$$self.$inject_state = $$props => {
    		if ("acheived" in $$props) $$invalidate(0, acheived = $$props.acheived);
    		if ("away" in $$props) $$invalidate(1, away = $$props.away);
    		if ("isDoveActive" in $$props) $$invalidate(2, isDoveActive = $$props.isDoveActive);
    		if ("time" in $$props) time = $$props.time;
    		if ("timer" in $$props) $$invalidate(3, timer = $$props.timer);
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("speed" in $$props) $$invalidate(5, speed = $$props.speed);
    		if ("interval" in $$props) interval = $$props.interval;
    		if ("start" in $$props) $$invalidate(6, start = $$props.start);
    		if ("box" in $$props) $$invalidate(7, box = $$props.box);
    		if ("boundary" in $$props) $$invalidate(8, boundary = $$props.boundary);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		acheived,
    		away,
    		isDoveActive,
    		timer,
    		level,
    		speed,
    		start,
    		box,
    		boundary,
    		handleShoot,
    		handleAway,
    		handleStart,
    		dove_boundary_binding,
    		dove_speed_binding,
    		div1_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
