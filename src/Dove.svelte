<script>
import { createEventDispatcher, onDestroy, onMount } from 'svelte';

export let boundary;
export let speed;

let doveCorord = {left: null, right: null};
let dove;
const dispatch = createEventDispatcher();
let doveMovement;
let birdFlying;
let birdY = 0;
const directions = ['asc', 'desc'];
const direction = directions[getRandomInt(0, 1)];
let flow = direction === 'asc'  ? 3 : -3;
let angle = direction === 'asc'  ? 120 : 30;

onMount(() => {
    if (!boundary) {
        console.log('no boundary')
    }
    doveCorord = {
        top: getRandomInt(0, boundary.height - 300), 
        left: -100
    };
    move();
})

function move(s) {
    console.log(s, speed)
    let counter = 0; 
    doveMovement = setInterval(() => {
        counter++;
        if (counter % 10 === 0) {
            doveCorord.top = doveCorord.top + flow;
            bound();
        }
        doveCorord.left = doveCorord.left + 1;
    
    }, speed);
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
    const hBound =  boundary.left >= postition.right || boundary.right <= postition.left;
    if (hBound) {
        dispatch('away');
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function changeSpeed(updated) {
    clearInterval(doveMovement);
    move(updated);
    fly()
}

onDestroy(() => {
    clearInterval(doveMovement);
    clearInterval(birdFlying);
})

function fly() {
    birdFlying = setInterval(() => {
        if (birdY === 1408-64) {
            birdY = 0;
            return;
        }
        birdY = birdY + 64;
    }, 60)      
}


$: changeSpeed(speed);

</script>
<style>
    .realDove {
        background-image: url("../assets/birdb.png");
        height: 64px;
        width: 64px;
        background-position-x: 64px;
        background-position-y: 0px;
        transform: rotate(30deg);
        position: absolute;
        zoom: 150%;
    }
</style>

{#if !isNaN(doveCorord.left)}
    <div 
        class="realDove" 
        bind:this={dove} 
        style={`
            background-position-y: ${birdY}px;
            left: ${doveCorord.left}px;
            top: ${doveCorord.top}px;
            transform: rotate(${angle}deg);`
            }
        on:click={ () => dispatch('shoot') }  
            >
    </div>
{/if}
    
    