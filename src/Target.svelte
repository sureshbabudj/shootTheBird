<script>

const coord = {top: 0, left: 0};
function handleMouseMove(e) {
    coord.top = e.y - 36;
    coord.left = e.x - 36;
}
</script>

        <i class="far fa-dot-circle target" style={`left: ${coord.left}px; top: ${coord.top}px`} onmousemove={handleMouseMove} />
    
    <style>
        .target {
            position: absolute;
            font-size: 3rem;
            color: red;
        }
    </style>
    
    