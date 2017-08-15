import { $, $$ } from "./bling";

const tabs = $$(".tablinks");

const handleClick = e => {
  e.preventDefault();
  $(".active").classList.remove("active");
  e.target.classList.add("active");
  const toOpen = e.target.getAttribute("data-open");
  $(".open").classList.remove("open");
  $(`.${toOpen}`).classList.add("open");
}

tabs.on("click", handleClick );

// if(window.innerWidth <= 832)
//   removeTabs()
// if(window.innerWidth > 832)
//   addTabs()

// test responsive 
// window.addEventListener("resize" , e => {
//   if(window.innerWidth <= 832)
//     removeTabs()
//   if(window.innerWidth > 832)
//     addTabs()
// })

function removeTabs(){
  tabs.forEach(t =>   t.addEventListener("click", handleClick ) )
  if($(".open")){
    if($(".open"))
      $(".open").classList.remove("open")
    document.querySelectorAll(".tablinks").forEach(tl => tl.style.display = "none")
    document.querySelectorAll(".tabcontent").forEach(tl => tl.style.display = "block")
  }
}

function addTabs(){
  const active = $(".active")
  let toOpen
  if(!active)
    toOpen = "description"
  else
    toOpen = active.getAttribute("data-open")
  $(`.${toOpen}`).classList.add("open");
  $(".open").display = "none";
  // document.querySelectorAll(".tabcontent").forEach(tl => tl.style.display = "none")
  // document.querySelectorAll(".tablinks").forEach(tl => tl.style.display = "inline-block")
  $(`.${toOpen}`).classList.add("open")
  // $(`.${toOpen}`).style.display = "block"
}

