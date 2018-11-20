Vue.component("sidebar", {
  props: {
    id: String,
    expanded: Boolean
  },
  template:
    '<div :id="id" class="sidebar">\
        <button class="sidebar-btn" @click="btnClicked()"/>\
        <slot></slot>\
    </div>'
});
