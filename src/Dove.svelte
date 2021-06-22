<script>
import { createEventDispatcher, onDestroy, onMount } from 'svelte';

export let boundary;
export let speed;

let doveCorord = {left: null, right: null};
let dove;
const dispatch = createEventDispatcher();
let doveMovement;

onMount(() => {
    if (!boundary) {
        console.log('no boundary')
    }
    doveCorord = {
        top: getRandomInt(0, boundary.height - 100), 
        left: -100
    };
    move();
})

function move(s) {
    let counter = 0; 
    doveMovement = setInterval(() => {
        counter++;
        if (counter % 10 === 0) {
            doveCorord.top = doveCorord.top + getRandomInt(-10, 10);
            bound();
        }
        doveCorord.left = doveCorord.left + 2;
    
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
}

onDestroy(() => {
    clearInterval(doveMovement);
})

$: changeSpeed(speed);

</script>
<style>
    .dove {
        position: absolute;
        font-size: 5rem;
        color: white;
        transition: left, top;
        transition-timing-function: ease-in-out;
    }
</style>

{#if !isNaN(doveCorord.left)}
    <i 
        bind:this={dove}
        class="fas fa-dove dove"
        style={`left: ${doveCorord.left}px; top: ${doveCorord.top}px`}
        on:click={ () => dispatch('shoot') } 
        >
    </i>
{/if}
    
    