/* @ds-bundle: {"format":4,"namespace":"FainoNaturalnoDesignSystem_69873b","components":[{"name":"PriceTag","sourcePath":"components/commerce/PriceTag.jsx"},{"name":"ProductCard","sourcePath":"components/commerce/ProductCard.jsx"},{"name":"Rating","sourcePath":"components/commerce/Rating.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"QuantityStepper","sourcePath":"components/forms/QuantityStepper.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"SectionHeader","sourcePath":"components/layout/SectionHeader.jsx"}],"sourceHashes":{"components/commerce/PriceTag.jsx":"ca61ee57dd0a","components/commerce/ProductCard.jsx":"dc889b02962f","components/commerce/Rating.jsx":"96aba2b42687","components/core/Badge.jsx":"30ab2bbeb92a","components/core/Button.jsx":"e97af749f775","components/core/Icon.jsx":"b3a79f68690c","components/core/IconButton.jsx":"62b8df2f0150","components/core/Tag.jsx":"85fb3305db5f","components/forms/Input.jsx":"5727d4704353","components/forms/QuantityStepper.jsx":"9065cb805741","components/layout/Card.jsx":"49c213912207","components/layout/SectionHeader.jsx":"e8e6fe2ca973","ui_kits/shop/App.jsx":"102664f49add","ui_kits/shop/CartScreen.jsx":"9af9705253a7","ui_kits/shop/CategoryScreen.jsx":"5e22ab9f0304","ui_kits/shop/Footer.jsx":"ca891e2bd406","ui_kits/shop/Header.jsx":"7c7e36ef32eb","ui_kits/shop/HomeScreen.jsx":"8cacb30b0c6d","ui_kits/shop/ProductScreen.jsx":"5d7ade068d14","ui_kits/shop/products.js":"b41683f298a5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FainoNaturalnoDesignSystem_69873b = window.FainoNaturalnoDesignSystem_69873b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/commerce/PriceTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Price display in ₴. Hand-drawn accent numeral, optional per-unit and old (struck) price. */
function PriceTag({
  amount,
  unit = "кг",
  old = null,
  currency = "₴",
  size = "md",
  style,
  ...rest
}) {
  const sizes = {
    sm: "var(--text-lg)",
    md: "var(--text-xl)",
    lg: "var(--text-2xl)"
  };
  const main = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fn-price",
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "8px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-accent)",
      fontWeight: 700,
      lineHeight: 1,
      fontSize: main,
      color: "var(--espresso-900)"
    }
  }, amount, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "0.7em"
    }
  }, " ", currency)), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, "/ ", unit), old != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      color: "var(--kraft-500)",
      textDecoration: "line-through"
    }
  }, old, " ", currency));
}
Object.assign(__ds_scope, { PriceTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/commerce/PriceTag.jsx", error: String((e && e.message) || e) }); }

// components/commerce/Rating.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Star rating in marigold. Read-only display with optional count. */
function Rating({
  value = 5,
  count = null,
  size = 16,
  style,
  ...rest
}) {
  const stars = [1, 2, 3, 4, 5];
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fn-rating",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: "1px"
    }
  }, stars.map(s => {
    const fill = value >= s ? 1 : value >= s - 0.5 ? 0.5 : 0;
    return /*#__PURE__*/React.createElement("span", {
      key: s,
      style: {
        position: "relative",
        width: size,
        height: size,
        display: "inline-block"
      }
    }, /*#__PURE__*/React.createElement(Star, {
      size: size,
      color: "var(--kraft-300)"
    }), fill > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        inset: 0,
        width: `${fill * 100}%`,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement(Star, {
      size: size,
      color: "var(--marigold-400)"
    })));
  })), count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, "(", count, ")"));
}
function Star({
  size,
  color
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: color,
    "aria-hidden": "true",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.06 1.11-6.47L2.6 9.35l6.5-.95L12 2.5z"
  }));
}
Object.assign(__ds_scope, { Rating });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/commerce/Rating.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Small status/label pill. Use for stock, "новинка", sale %, category tone. */
function Badge({
  children,
  tone = "marigold",
  size = "md",
  style,
  ...rest
}) {
  const tones = {
    marigold: {
      background: "var(--marigold-400)",
      color: "var(--espresso-900)",
      border: "transparent"
    },
    fresh: {
      background: "var(--garden-100)",
      color: "var(--garden-700)",
      border: "transparent"
    },
    sale: {
      background: "var(--chili-500)",
      color: "var(--white)",
      border: "transparent"
    },
    ink: {
      background: "var(--espresso-800)",
      color: "var(--kraft-50)",
      border: "transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--cinnamon-700)",
      border: "var(--border-width) solid var(--border-strong)"
    }
  };
  const sizes = {
    sm: {
      padding: "2px 8px",
      fontSize: "var(--text-2xs)"
    },
    md: {
      padding: "4px 11px",
      fontSize: "var(--text-xs)"
    }
  };
  const t = tones[tone] || tones.marigold;
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "fn-badge",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      borderRadius: "var(--radius-pill)",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      background: t.background,
      color: t.color,
      border: t.border,
      padding: s.padding,
      fontSize: s.fontSize,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Primary action control. Marigold-filled by default; espresso outline & ghost variants. */
function Button({
  children,
  variant = "primary",
  size = "md",
  full = false,
  iconLeft = null,
  iconRight = null,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "8px 16px",
      fontSize: "var(--text-sm)",
      gap: "6px",
      radius: "var(--radius-sm)"
    },
    md: {
      padding: "12px 22px",
      fontSize: "var(--text-base)",
      gap: "8px",
      radius: "var(--radius-md)"
    },
    lg: {
      padding: "16px 30px",
      fontSize: "var(--text-md)",
      gap: "10px",
      radius: "var(--radius-md)"
    }
  };
  const variants = {
    primary: {
      background: "var(--marigold-400)",
      color: "var(--text-on-marigold)",
      border: "var(--border-width) solid var(--marigold-500)",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "transparent",
      color: "var(--espresso-800)",
      border: "var(--border-width) solid var(--espresso-800)"
    },
    ghost: {
      background: "transparent",
      color: "var(--espresso-800)",
      border: "var(--border-width) solid transparent"
    },
    fresh: {
      background: "var(--garden-500)",
      color: "var(--white)",
      border: "var(--border-width) solid var(--garden-700)",
      boxShadow: "var(--shadow-sm)"
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    className: "fn-button",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      padding: s.padding,
      fontSize: s.fontSize,
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      lineHeight: 1,
      letterSpacing: "0.01em",
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      width: full ? "100%" : "auto",
      transition: "transform var(--dur-fast) var(--ease-out), filter var(--dur) var(--ease-out), background var(--dur) var(--ease-out)",
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "translateY(1px)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "translateY(0)";
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "brightness(0.94)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.filter = "none";
      e.currentTarget.style.transform = "translateY(0)";
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/commerce/ProductCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Product tile for shop grids: image slot, category, name, price, add-to-cart.
 *  `image` is an optional URL; when absent a warm kraft placeholder shows. */
function ProductCard({
  name,
  category = "",
  price,
  oldPrice = null,
  unit = "кг",
  image = null,
  badge = null,
  // { text, tone }
  onAdd,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fn-product-card",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-card)",
      border: "var(--border-width) solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      transition: "transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
      transform: hover ? "translateY(-3px)" : "translateY(0)",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-xs)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "1 / 1",
      background: "var(--kraft-100)"
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--kraft-400)",
      fontFamily: "var(--font-accent)",
      fontSize: "var(--text-xl)"
    }
  }, "\u0444\u043E\u0442\u043E"), badge && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: badge.tone || "marigold",
    size: "sm"
  }, badge.text))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      flex: 1
    }
  }, category && /*#__PURE__*/React.createElement("span", {
    className: "fn-eyebrow",
    style: {
      fontSize: "var(--text-2xs)"
    }
  }, category), /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      fontSize: "var(--text-md)",
      color: "var(--espresso-900)",
      lineHeight: 1.25
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      paddingTop: "var(--space-3)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PriceTag, {
    amount: price,
    old: oldPrice,
    unit: unit,
    size: "md"
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    onClick: onAdd,
    "aria-label": `Додати ${name} в кошик`
  }, "\u0412 \u043A\u043E\u0448\u0438\u043A"))));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/commerce/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Icon wrapper for the Lucide line set (the brand's UI glyph system).
 *  Requires the Lucide UMD script on the page; upgrades a placeholder to an inline SVG.
 *  Names are Lucide kebab-case, e.g. "shopping-bag", "leaf", "search", "heart". */
function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  color = "currentColor",
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el && window.lucide && typeof window.lucide.createIcons === "function") {
      el.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      el.appendChild(i);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          "stroke-width": strokeWidth
        },
        nameAttr: "data-lucide"
      });
    }
  }, [name, size, strokeWidth]);
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    className: "fn-icon",
    "aria-hidden": "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      color,
      flexShrink: 0,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Circular/soft icon-only button. Wraps a glyph (e.g. cart, heart, search). */
function IconButton({
  children,
  label,
  variant = "soft",
  size = "md",
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: 34,
    md: 42,
    lg: 50
  };
  const dim = sizes[size] || sizes.md;
  const variants = {
    soft: {
      background: "var(--kraft-100)",
      color: "var(--espresso-800)",
      border: "var(--border-width) solid var(--border-subtle)"
    },
    solid: {
      background: "var(--marigold-400)",
      color: "var(--espresso-900)",
      border: "var(--border-width) solid var(--marigold-500)"
    },
    ghost: {
      background: "transparent",
      color: "var(--espresso-800)",
      border: "var(--border-width) solid transparent"
    }
  };
  const v = variants[variant] || variants.soft;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    className: "fn-icon-button",
    style: {
      width: dim,
      height: dim,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "filter var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
      ...v,
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "brightness(0.95)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.filter = "none";
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.94)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Selectable category / filter chip. Toggles between rest and active (marigold) state. */
function Tag({
  children,
  active = false,
  iconLeft = null,
  onClick,
  style,
  ...rest
}) {
  const interactive = typeof onClick === "function";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    className: "fn-tag",
    "aria-pressed": active,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-semibold)",
      fontSize: "var(--text-sm)",
      borderRadius: "var(--radius-pill)",
      cursor: interactive ? "pointer" : "default",
      background: active ? "var(--espresso-800)" : "var(--kraft-100)",
      color: active ? "var(--kraft-50)" : "var(--espresso-800)",
      border: `var(--border-width) solid ${active ? "var(--espresso-800)" : "var(--border-subtle)"}`,
      transition: "background var(--dur) var(--ease-out), color var(--dur) var(--ease-out)",
      ...style
    },
    onMouseEnter: e => {
      if (!active) e.currentTarget.style.borderColor = "var(--border-strong)";
    },
    onMouseLeave: e => {
      if (!active) e.currentTarget.style.borderColor = "var(--border-subtle)";
    }
  }, rest), iconLeft, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input with optional label, leading icon, and error state. */
function Input({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  iconLeft = null,
  error = "",
  hint = "",
  disabled = false,
  style,
  ...rest
}) {
  const inputId = id || (label ? `fn-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const border = error ? "var(--chili-500)" : "var(--border-strong)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-semibold)",
      fontSize: "var(--text-sm)",
      color: "var(--espresso-800)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 14,
      display: "inline-flex",
      color: "var(--kraft-500)"
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    disabled: disabled,
    className: "fn-input",
    style: {
      width: "100%",
      padding: iconLeft ? "12px 16px 12px 42px" : "12px 16px",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      color: "var(--espresso-800)",
      background: disabled ? "var(--kraft-200)" : "var(--white)",
      border: `var(--border-width) solid ${border}`,
      borderRadius: "var(--radius-md)",
      outline: "none",
      transition: "border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
      ...style
    },
    onFocus: e => {
      if (!error) {
        e.target.style.borderColor = "var(--marigold-500)";
        e.target.style.boxShadow = "var(--shadow-focus)";
      }
    },
    onBlur: e => {
      e.target.style.boxShadow = "none";
      e.target.style.borderColor = border;
    }
  }, rest))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: error ? "var(--chili-500)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/QuantityStepper.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Quantity stepper for cart lines / product quantity (in kg or units). */
function QuantityStepper({
  value = 1,
  min = 1,
  max = 99,
  step = 1,
  unit = "",
  onChange,
  size = "md",
  style,
  ...rest
}) {
  const dim = size === "sm" ? 32 : 40;
  const set = v => {
    const n = Math.max(min, Math.min(max, v));
    if (onChange) onChange(n);
  };
  const btn = (label, fn, disabled) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: fn,
    disabled: disabled,
    "aria-label": label,
    style: {
      width: dim,
      height: dim,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      background: "transparent",
      fontSize: size === "sm" ? "18px" : "22px",
      lineHeight: 1,
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      color: disabled ? "var(--kraft-400)" : "var(--espresso-800)",
      cursor: disabled ? "not-allowed" : "pointer"
    }
  }, label);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fn-stepper",
    style: {
      display: "inline-flex",
      alignItems: "center",
      border: "var(--border-width) solid var(--border-strong)",
      borderRadius: "var(--radius-pill)",
      background: "var(--white)",
      overflow: "hidden",
      ...style
    }
  }, rest), btn("–", () => set(value - step), value <= min), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 44,
      textAlign: "center",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-bold)",
      fontSize: size === "sm" ? "var(--text-sm)" : "var(--text-base)",
      color: "var(--espresso-900)"
    }
  }, value, unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--fw-regular)",
      color: "var(--text-muted)",
      fontSize: "var(--text-xs)"
    }
  }, " ", unit)), btn("+", () => set(value + step), value >= max));
}
Object.assign(__ds_scope, { QuantityStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/QuantityStepper.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Generic surface container. Tones: card (white), cream (kraft), ink (dark espresso). */
function Card({
  children,
  tone = "card",
  pad = "lg",
  bordered = true,
  style,
  ...rest
}) {
  const tones = {
    card: {
      background: "var(--surface-card)",
      color: "var(--text-body)"
    },
    cream: {
      background: "var(--surface-cream)",
      color: "var(--text-body)"
    },
    ink: {
      background: "var(--surface-ink)",
      color: "var(--text-on-ink)"
    },
    marigold: {
      background: "var(--marigold-400)",
      color: "var(--espresso-900)"
    }
  };
  const pads = {
    none: "0",
    sm: "var(--space-4)",
    md: "var(--space-5)",
    lg: "var(--space-6)"
  };
  const t = tones[tone] || tones.card;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fn-card",
    style: {
      background: t.background,
      color: t.color,
      padding: pads[pad] ?? pads.lg,
      borderRadius: "var(--radius-lg)",
      border: bordered && tone === "card" ? "var(--border-width) solid var(--border-subtle)" : "none",
      boxShadow: tone === "ink" || tone === "marigold" ? "var(--shadow-md)" : "var(--shadow-xs)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/layout/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Section header with eyebrow, display title, optional trailing action/link. */
function SectionHeader({
  eyebrow,
  title,
  action = null,
  align = "left",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "fn-section-header",
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "var(--space-4)",
      flexWrap: "wrap",
      textAlign: align,
      marginBottom: "var(--space-5)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      alignItems: align === "center" ? "center" : "flex-start",
      flex: 1
    }
  }, eyebrow && /*#__PURE__*/React.createElement("span", {
    className: "fn-eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-2xl)"
    }
  }, title)), action);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/App.jsx
try { (() => {
// Interactive shell: routing + cart state across all shop screens.
(function () {
  const {
    Header,
    Footer,
    HomeScreen,
    CategoryScreen,
    ProductScreen,
    CartScreen
  } = window;
  function App() {
    const [route, setRoute] = React.useState({
      view: "home"
    });
    const [cart, setCart] = React.useState([]);
    const [toast, setToast] = React.useState(null);
    const nav = (view, arg) => {
      setRoute({
        view,
        arg
      });
      window.scrollTo({
        top: 0
      });
    };
    const openProduct = p => {
      setRoute({
        view: "product",
        arg: p
      });
      window.scrollTo({
        top: 0
      });
    };
    const addToCart = (p, qty) => {
      const q = qty || (p.unit === "кг" ? 0.5 : 1);
      setCart(c => {
        const ex = c.find(it => it.id === p.id);
        if (ex) return c.map(it => it.id === p.id ? {
          ...it,
          qty: Math.round((it.qty + q) * 100) / 100
        } : it);
        return [...c, {
          ...p,
          qty: q
        }];
      });
      setToast(`«${p.name}» — у кошику`);
      clearTimeout(window.__t);
      window.__t = setTimeout(() => setToast(null), 2200);
    };
    const setQty = (id, v) => setCart(c => c.map(it => it.id === id ? {
      ...it,
      qty: v
    } : it));
    const removeItem = id => setCart(c => c.filter(it => it.id !== id));
    const count = cart.reduce((s, it) => s + 1, 0);
    React.useEffect(() => {
      if (window.lucide) window.lucide.createIcons();
    });
    let screen;
    if (route.view === "home") screen = /*#__PURE__*/React.createElement(HomeScreen, {
      onNav: nav,
      onAdd: addToCart,
      onOpen: openProduct
    });else if (route.view === "category") screen = /*#__PURE__*/React.createElement(CategoryScreen, {
      cat: route.arg,
      onNav: nav,
      onAdd: addToCart,
      onOpen: openProduct
    });else if (route.view === "product") screen = /*#__PURE__*/React.createElement(ProductScreen, {
      product: route.arg,
      onNav: nav,
      onAdd: addToCart,
      onOpen: openProduct
    });else if (route.view === "cart") screen = /*#__PURE__*/React.createElement(CartScreen, {
      items: cart,
      onQty: setQty,
      onRemove: removeItem,
      onNav: nav
    });
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Header, {
      cartCount: count,
      onNav: nav,
      onCart: () => nav("cart")
    }), screen, /*#__PURE__*/React.createElement(Footer, null), toast && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--espresso-800)",
        color: "var(--kraft-50)",
        padding: "14px 22px",
        borderRadius: "var(--radius-pill)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 600,
        zIndex: 50
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--marigold-400)"
      }
    }), toast));
  }
  window.App = App;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/CartScreen.jsx
try { (() => {
// Cart screen: line items with steppers, order summary, checkout. Empty state too.
(function () {
  const {
    QuantityStepper,
    PriceTag,
    Button,
    Card,
    Icon,
    IconButton,
    Input
  } = window.FainoNaturalnoDesignSystem_69873b;
  function CartScreen({
    items,
    onQty,
    onRemove,
    onNav
  }) {
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = subtotal >= 800 || subtotal === 0 ? 0 : 60;
    const total = subtotal + shipping;
    const fmt = n => Math.round(n * 100) / 100;
    if (!items.length) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 620,
          margin: "0 auto",
          padding: "var(--space-9) var(--space-5)",
          textAlign: "center"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--kraft-100)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "shopping-bag",
        size: 32,
        color: "var(--kraft-500)"
      })), /*#__PURE__*/React.createElement("h2", null, "\u041A\u043E\u0448\u0438\u043A \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u0439"), /*#__PURE__*/React.createElement("p", {
        style: {
          color: "var(--text-muted)"
        }
      }, "\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0443\u043B\u044E\u0431\u043B\u0435\u043D\u0456 \u0441\u0443\u0445\u043E\u0444\u0440\u0443\u043A\u0442\u0438, \u0433\u043E\u0440\u0456\u0445\u0438 \u0447\u0438 \u0447\u0430\u0439 \u2014 \u0456 \u043F\u043E\u0432\u0435\u0440\u0442\u0430\u0439\u0442\u0435\u0441\u044F \u0441\u044E\u0434\u0438."), /*#__PURE__*/React.createElement(Button, {
        size: "lg",
        onClick: () => onNav("category", "all")
      }, "\u0414\u043E \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0443"));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-5)"
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: "var(--text-2xl)"
      }
    }, "\u041A\u043E\u0448\u0438\u043A"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: "var(--space-6)",
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, items.map(it => /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: {
        display: "flex",
        gap: 16,
        alignItems: "center",
        background: "var(--white)",
        border: "var(--border-width) solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 80,
        height: 80,
        background: "var(--kraft-100)",
        borderRadius: "var(--radius-md)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--kraft-400)",
        fontFamily: "var(--font-accent)"
      }
    }, "\u0444\u043E\u0442\u043E"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--cinnamon-700)"
      }
    }, it.category), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 16,
        color: "var(--espresso-900)"
      }
    }, it.name), /*#__PURE__*/React.createElement(PriceTag, {
      amount: it.price,
      unit: it.unit,
      size: "sm"
    })), /*#__PURE__*/React.createElement(QuantityStepper, {
      value: it.qty,
      step: it.unit === "кг" ? 0.5 : 1,
      min: it.unit === "кг" ? 0.5 : 1,
      unit: it.unit,
      size: "sm",
      onChange: v => onQty(it.id, v)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 90,
        textAlign: "right",
        fontWeight: 700,
        color: "var(--espresso-900)"
      }
    }, fmt(it.price * it.qty), " \u20B4"), /*#__PURE__*/React.createElement(IconButton, {
      label: "\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438",
      variant: "ghost",
      size: "sm",
      onClick: () => onRemove(it.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trash-2",
      size: 18,
      color: "var(--chili-500)"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginTop: 6,
        maxWidth: 380
      }
    }, /*#__PURE__*/React.createElement(Input, {
      placeholder: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary"
    }, "\u0417\u0430\u0441\u0442\u043E\u0441\u0443\u0432\u0430\u0442\u0438"))), /*#__PURE__*/React.createElement(Card, {
      tone: "cream",
      pad: "md",
      style: {
        position: "sticky",
        top: 96
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        marginTop: 0
      }
    }, "\u0420\u0430\u0437\u043E\u043C"), /*#__PURE__*/React.createElement(Row, {
      label: "\u0421\u0443\u043C\u0430",
      value: `${fmt(subtotal)} ₴`
    }), /*#__PURE__*/React.createElement(Row, {
      label: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430",
      value: shipping === 0 ? "безкоштовно" : `${shipping} ₴`
    }), shipping > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-accent)",
        fontWeight: 700,
        color: "var(--cinnamon-700)",
        fontSize: 18,
        margin: "4px 0 8px"
      }
    }, "\u0449\u0435 ", fmt(800 - subtotal), " \u20B4 \u0434\u043E \u0431\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u043E\u0457 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438"), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1.5px solid var(--border-strong)",
        margin: "12px 0",
        paddingTop: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 18
      }
    }, "\u0414\u043E \u0441\u043F\u043B\u0430\u0442\u0438"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 26,
        color: "var(--espresso-900)"
      }
    }, fmt(total), " \u20B4")), /*#__PURE__*/React.createElement(Button, {
      full: true,
      size: "lg",
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 18
      })
    }, "\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        textAlign: "center",
        margin: "12px 0 0"
      }
    }, "\u041F\u0435\u0440\u0435\u0434\u0437\u0432\u043E\u043D\u0438\u043C\u043E, \u0449\u043E\u0431 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F"))));
  }
  function Row({
    label,
    value
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 15,
        color: "var(--espresso-800)",
        padding: "4px 0"
      }
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, value));
  }
  window.CartScreen = CartScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/CartScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/CategoryScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Category listing: filter tags + sort, responsive product grid.
(function () {
  const {
    Tag,
    ProductCard,
    SectionHeader,
    Icon
  } = window.FainoNaturalnoDesignSystem_69873b;
  const CAT_LABELS = {
    all: "Усі товари",
    dry: "Сухофрукти",
    nuts: "Горіхи",
    tea: "Чай",
    spice: "Спеції",
    oil: "Олії",
    gift: "Подарункові набори"
  };
  function CategoryScreen({
    cat = "all",
    onNav,
    onAdd,
    onOpen
  }) {
    const all = window.SHOP_PRODUCTS;
    const [active, setActive] = React.useState(cat);
    React.useEffect(() => setActive(cat), [cat]);
    const filters = ["all", "dry", "nuts", "tea", "spice", "oil", "gift"];
    const list = active === "all" ? all : all.filter(p => p.cat === active);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-5)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNav("home");
      }
    }, "\u0413\u043E\u043B\u043E\u0432\u043D\u0430"), " \xB7 ", CAT_LABELS[active]), /*#__PURE__*/React.createElement(SectionHeader, {
      eyebrow: "\u041C\u0430\u0433\u0430\u0437\u0438\u043D",
      title: CAT_LABELS[active]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: "var(--space-6)"
      }
    }, filters.map(f => /*#__PURE__*/React.createElement(Tag, {
      key: f,
      active: active === f,
      onClick: () => setActive(f)
    }, CAT_LABELS[f]))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "var(--space-4)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--text-muted)"
      }
    }, list.length, " \u0442\u043E\u0432\u0430\u0440\u0456\u0432"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        fontWeight: 600,
        color: "var(--espresso-800)",
        cursor: "pointer"
      }
    }, "\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u0456 ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 16
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: "var(--space-5)"
      }
    }, list.map(p => /*#__PURE__*/React.createElement(ProductCard, _extends({
      key: p.id
    }, p, {
      onAdd: () => onAdd(p),
      onClick: () => onOpen(p),
      style: {
        cursor: "pointer"
      }
    })))));
  }
  window.CategoryScreen = CategoryScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/CategoryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/Footer.jsx
try { (() => {
// Shop footer with contacts from the business card.
(function () {
  const {
    Icon
  } = window.FainoNaturalnoDesignSystem_69873b;
  function Footer() {
    const col = (title, items) => /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fn-eyebrow",
      style: {
        color: "var(--marigold-300)"
      }
    }, title), items.map((t, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        fontSize: 14,
        color: "var(--kraft-200)"
      }
    }, t)));
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        background: "var(--espresso-800)",
        color: "var(--kraft-50)",
        marginTop: "var(--space-9)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-7) var(--space-5)",
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr",
        gap: "var(--space-6)"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo.png",
      alt: "Faino Naturalno",
      style: {
        height: 72,
        marginBottom: 12
      }
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        color: "var(--kraft-200)",
        maxWidth: 260,
        margin: 0
      }
    }, "\u041D\u0430\u0442\u0443\u0440\u0430\u043B\u044C\u043D\u0456 \u0434\u0430\u0440\u0438 \u0417\u0430\u043A\u0430\u0440\u043F\u0430\u0442\u0442\u044F \u2014 \u0441\u0443\u0445\u043E\u0444\u0440\u0443\u043A\u0442\u0438, \u0433\u043E\u0440\u0456\u0445\u0438 \u0442\u0430 \u0441\u043F\u0435\u0446\u0456\u0457, \u0437\u0456\u0431\u0440\u0430\u043D\u0456 \u0439 \u043F\u0456\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0456 \u0440\u0443\u043A\u0430\u043C\u0438.")), col("Магазин", ["Сухофрукти", "Горіхи", "Чай та спеції", "Подарункові набори"]), col("Допомога", ["Доставка й оплата", "Повернення", "Часті питання"]), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fn-eyebrow",
      style: {
        color: "var(--marigold-300)"
      }
    }, "\u0417\u0432'\u044F\u0437\u0430\u0442\u0438\u0441\u044F"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--kraft-200)",
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 16,
      color: "var(--marigold-300)"
    }), "\u043C. \u0411\u0435\u0440\u0435\u0433\u043E\u0432\u043E, \u0426\u0435\u043D\u0442\u0440\u0430\u043B\u044C\u043D\u0438\u0439 \u0440\u0438\u043D\u043E\u043A, \u0432\u0443\u043B. \u0421\u0456\u0447\u0435\u043D\u0456 10"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--kraft-200)",
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 16,
      color: "var(--marigold-300)"
    }), "+38 (095) 348 85 36 \xB7 \u041E\u043B\u0435\u043D\u0430"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--kraft-200)",
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 16,
      color: "var(--marigold-300)"
    }), "+38 (066) 839 00 05 \xB7 \u0410\u043D\u0434\u0440\u0456\u0439"))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid rgba(255,255,255,.12)",
        padding: "16px var(--space-5)",
        textAlign: "center",
        fontSize: 13,
        color: "var(--kraft-500)"
      }
    }, "\xA9 2026 \u0424\u0430\u0439\u043D\u043E \u041D\u0430\u0442\u0443\u0440\u0430\u043B\u044C\u043D\u043E. \u0417\u0440\u043E\u0431\u043B\u0435\u043D\u043E \u0437 \u043B\u044E\u0431\u043E\u0432'\u044E \u043D\u0430 \u0417\u0430\u043A\u0430\u0440\u043F\u0430\u0442\u0442\u0456."));
  }
  window.Footer = Footer;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/Header.jsx
try { (() => {
// Shop header: logo lockup, category nav, search, cart. Composes DS Icon/IconButton/Input.
(function () {
  const {
    Icon,
    IconButton,
    Input,
    Badge
  } = window.FainoNaturalnoDesignSystem_69873b;
  function Header({
    cartCount = 0,
    onNav,
    onCart
  }) {
    const cats = [["Сухофрукти", "dry"], ["Горіхи", "nuts"], ["Чай", "tea"], ["Спеції", "spice"], ["Олії", "oil"], ["Набори", "gift"]];
    return /*#__PURE__*/React.createElement("header", {
      style: {
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--kraft-50)",
        borderBottom: "var(--border-width) solid var(--border-subtle)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "10px var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)"
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNav("home");
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        textDecoration: "none"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo.png",
      alt: "Faino Naturalno",
      style: {
        height: 54
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 18,
        color: "var(--espresso-900)",
        lineHeight: 1,
        letterSpacing: "-.01em"
      }
    }, "\u0424\u0430\u0439\u043D\u043E", /*#__PURE__*/React.createElement("br", null), "\u043D\u0430\u0442\u0443\u0440\u0430\u043B\u044C\u043D\u043E")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        maxWidth: 420
      }
    }, /*#__PURE__*/React.createElement(Input, {
      placeholder: "\u041F\u043E\u0448\u0443\u043A: \u043C\u0438\u0433\u0434\u0430\u043B\u044C, \u043A\u0443\u0440\u0430\u0433\u0430, \u0447\u0430\u0439\u2026",
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "search",
        size: 18
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "\u0423\u043B\u044E\u0431\u043B\u0435\u043D\u0435"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "heart"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "\u041A\u043E\u0448\u0438\u043A",
      variant: "solid",
      onClick: onCart
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shopping-bag"
    })), cartCount > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -4,
        right: -4,
        background: "var(--chili-500)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px"
      }
    }, cartCount)))), /*#__PURE__*/React.createElement("nav", {
      style: {
        borderTop: "1px solid var(--border-subtle)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "0 var(--space-5)",
        display: "flex",
        gap: 4,
        alignItems: "center"
      }
    }, cats.map(([label, id]) => /*#__PURE__*/React.createElement("a", {
      key: id,
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNav("category", id);
      },
      style: {
        padding: "12px 14px",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--espresso-800)",
        textDecoration: "none",
        borderBottom: "2.5px solid transparent"
      },
      onMouseEnter: e => e.currentTarget.style.borderBottomColor = "var(--marigold-400)",
      onMouseLeave: e => e.currentTarget.style.borderBottomColor = "transparent"
    }, label)), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontFamily: "var(--font-accent)",
        fontWeight: 700,
        fontSize: 20,
        color: "var(--cinnamon-700)"
      }
    }, "\u0431\u0435\u0437\u043A\u043E\u0448\u0442\u043E\u0432\u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0432\u0456\u0434 800 \u20B4"))));
  }
  window.Header = Header;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Home screen: marigold hero, category shortcuts, bestseller grid, promo block.
(function () {
  const {
    Button,
    SectionHeader,
    ProductCard,
    Card,
    Icon,
    Badge
  } = window.FainoNaturalnoDesignSystem_69873b;
  function HomeScreen({
    onNav,
    onAdd,
    onOpen
  }) {
    const products = window.SHOP_PRODUCTS;
    const cats = [["Сухофрукти", "dry", "grape"], ["Горіхи", "nuts", "nut"], ["Чай", "tea", "leaf"], ["Спеції", "spice", "flower-2"], ["Олії", "oil", "droplet"], ["Набори", "gift", "gift"]];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
      style: {
        background: "var(--marigold-400)",
        borderBottom: "var(--border-width) solid var(--marigold-500)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-8) var(--space-5)",
        display: "grid",
        gridTemplateColumns: "1.2fr .8fr",
        gap: "var(--space-6)",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "fn-eyebrow",
      style: {
        color: "var(--espresso-700)"
      }
    }, "\u041D\u0430\u0442\u0443\u0440\u0430\u043B\u044C\u043D\u0456 \u0434\u0430\u0440\u0438 \u0417\u0430\u043A\u0430\u0440\u043F\u0430\u0442\u0442\u044F"), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: "var(--text-4xl)",
        margin: "12px 0 8px",
        color: "var(--espresso-900)"
      }
    }, "\u0421\u043C\u0430\u0447\u043D\u043E, \u044F\u043A \u0443\u0434\u043E\u043C\u0430"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-accent)",
        fontWeight: 700,
        fontSize: 30,
        color: "var(--cinnamon-700)",
        margin: "0 0 20px"
      }
    }, "\u0441\u0443\u0445\u043E\u0444\u0440\u0443\u043A\u0442\u0438, \u0433\u043E\u0440\u0456\u0445\u0438 \u0442\u0430 \u0441\u043F\u0435\u0446\u0456\u0457, \u0437\u0456\u0431\u0440\u0430\u043D\u0456 \u0440\u0443\u043A\u0430\u043C\u0438"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      onClick: () => onNav("category", "dry"),
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 18
      })
    }, "\u0414\u043E \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0443"), /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      variant: "secondary",
      onClick: () => onNav("category", "gift")
    }, "\u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043A\u043E\u0432\u0456 \u043D\u0430\u0431\u043E\u0440\u0438"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo.png",
      alt: "",
      style: {
        width: 300,
        filter: "drop-shadow(0 16px 32px rgba(59,36,18,.25))"
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-7) var(--space-5)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(6,1fr)",
        gap: "var(--space-4)",
        marginBottom: "var(--space-8)"
      }
    }, cats.map(([label, id, icon]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onNav("category", id),
      style: {
        background: "var(--white)",
        border: "var(--border-width) solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        transition: "all var(--dur) var(--ease-out)"
      },
      onMouseEnter: e => {
        e.currentTarget.style.borderColor = "var(--marigold-400)";
        e.currentTarget.style.transform = "translateY(-3px)";
      },
      onMouseLeave: e => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "translateY(0)";
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "var(--kraft-100)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 24,
      color: "var(--cinnamon-700)"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        color: "var(--espresso-800)"
      }
    }, label)))), /*#__PURE__*/React.createElement(SectionHeader, {
      eyebrow: "\u041C\u0430\u0433\u0430\u0437\u0438\u043D",
      title: "\u041A\u0443\u043F\u0443\u044E\u0442\u044C \u043D\u0430\u0439\u0447\u0430\u0441\u0442\u0456\u0448\u0435",
      action: /*#__PURE__*/React.createElement(Button, {
        variant: "ghost",
        onClick: () => onNav("category", "all")
      }, "\u0423\u0441\u0456 \u0442\u043E\u0432\u0430\u0440\u0438 \u2192")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: "var(--space-5)"
      }
    }, products.slice(0, 4).map(p => /*#__PURE__*/React.createElement(ProductCard, _extends({
      key: p.id
    }, p, {
      onAdd: () => onAdd(p),
      onClick: () => onOpen(p),
      style: {
        cursor: "pointer"
      }
    })))), /*#__PURE__*/React.createElement(Card, {
      tone: "ink",
      pad: "lg",
      style: {
        marginTop: "var(--space-8)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-6)",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
      tone: "marigold"
    }, "\u041F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A"), /*#__PURE__*/React.createElement("h2", {
      style: {
        color: "var(--kraft-50)",
        margin: "12px 0 8px"
      }
    }, "\u041A\u0440\u0430\u0444\u0442\u043E\u0432\u0456 \u043D\u0430\u0431\u043E\u0440\u0438 \u0434\u043E \u0441\u0432\u044F\u0442"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: "var(--kraft-200)",
        margin: "0 0 20px"
      }
    }, "\u0417\u0431\u0435\u0440\u0435\u043C\u043E \u043A\u043E\u0440\u043E\u0431\u043A\u0443 \u0456\u0437 \u0441\u0443\u0445\u043E\u0444\u0440\u0443\u043A\u0442\u0456\u0432, \u0433\u043E\u0440\u0456\u0445\u0456\u0432 \u0456 \u043A\u0430\u0440\u043F\u0430\u0442\u0441\u044C\u043A\u043E\u0433\u043E \u0447\u0430\u044E \u2014 \u0433\u043E\u0442\u043E\u0432\u0438\u0439 \u043F\u043E\u0434\u0430\u0440\u0443\u043D\u043E\u043A \u0456\u0437 \u0417\u0430\u043A\u0430\u0440\u043F\u0430\u0442\u0442\u044F."), /*#__PURE__*/React.createElement(Button, {
      onClick: () => onNav("category", "gift")
    }, "\u041E\u0431\u0440\u0430\u0442\u0438 \u043D\u0430\u0431\u0456\u0440")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16
      }
    }, [["Тепло", "у кожній коробці"], ["Без цукру", "тільки натуральне"], ["Ручний", "відбір продуктів"], ["Доставка", "по всій Україні"]].map(([a, b], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "rgba(255,255,255,.06)",
        borderRadius: "var(--radius-md)",
        padding: "16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 20,
        color: "var(--marigold-300)"
      }
    }, a), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--kraft-200)"
      }
    }, b)))))));
  }
  window.HomeScreen = HomeScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/ProductScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Product detail: gallery placeholder, price, quantity, add-to-cart, meta, related.
(function () {
  const {
    PriceTag,
    Rating,
    Badge,
    Button,
    QuantityStepper,
    Icon,
    ProductCard,
    SectionHeader
  } = window.FainoNaturalnoDesignSystem_69873b;
  function ProductScreen({
    product,
    onNav,
    onAdd,
    onOpen
  }) {
    const [qty, setQty] = React.useState(1);
    const all = window.SHOP_PRODUCTS;
    const related = all.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 4);
    const rel = related.length ? related : all.slice(0, 4);
    const perUnit = product.unit === "кг" ? 0.5 : 1;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-5)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNav("home");
      }
    }, "\u0413\u043E\u043B\u043E\u0432\u043D\u0430"), " \xB7 ", /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNav("category", product.cat);
      }
    }, product.category), " \xB7 ", product.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-7)"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        aspectRatio: "1/1",
        background: "var(--kraft-100)",
        borderRadius: "var(--radius-xl)",
        border: "var(--border-width) solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--kraft-400)",
        fontFamily: "var(--font-accent)",
        fontSize: 32,
        position: "relative"
      }
    }, product.badge && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 16,
        left: 16
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: product.badge.tone
    }, product.badge.text)), "\u0444\u043E\u0442\u043E \u0442\u043E\u0432\u0430\u0440\u0443"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        marginTop: 12
      }
    }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 72,
        height: 72,
        background: "var(--kraft-100)",
        borderRadius: "var(--radius-md)",
        border: i === 0 ? "2.5px solid var(--marigold-400)" : "var(--border-width) solid var(--border-subtle)"
      }
    })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "fn-eyebrow"
    }, product.category), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontSize: "var(--text-2xl)",
        margin: "10px 0 12px"
      }
    }, product.name), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(Rating, {
      value: product.rating,
      count: product.reviews
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement(PriceTag, {
      amount: product.price,
      old: product.oldPrice,
      unit: product.unit,
      size: "lg"
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        color: "var(--text-body)",
        maxWidth: 460
      }
    }, product.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        margin: "24px 0"
      }
    }, /*#__PURE__*/React.createElement(QuantityStepper, {
      value: qty,
      step: perUnit,
      min: perUnit,
      unit: product.unit,
      onChange: setQty
    }), /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "shopping-bag",
        size: 18
      }),
      onClick: () => onAdd(product, qty)
    }, "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u043A\u043E\u0448\u0438\u043A")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderTop: "1px solid var(--border-subtle)",
        paddingTop: 18
      }
    }, [["truck", "Безкоштовна доставка від 800 ₴"], ["leaf", "100% натурально, без консервантів"], ["package", "Свіжа фасовка під замовлення"]].map(([ic, t]) => /*#__PURE__*/React.createElement("span", {
      key: t,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        color: "var(--espresso-800)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 18,
      color: "var(--garden-500)"
    }), t))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "var(--space-8)"
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      eyebrow: "\u0429\u0435 \u0437 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u0457",
      title: "\u0421\u0445\u043E\u0436\u0435 \u0432\u0430\u043C \u0441\u043F\u043E\u0434\u043E\u0431\u0430\u0454\u0442\u044C\u0441\u044F"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: "var(--space-5)"
      }
    }, rel.map(p => /*#__PURE__*/React.createElement(ProductCard, _extends({
      key: p.id
    }, p, {
      onAdd: () => onAdd(p),
      onClick: () => onOpen(p),
      style: {
        cursor: "pointer"
      }
    }))))));
  }
  window.ProductScreen = ProductScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/ProductScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shop/products.js
try { (() => {
// Shared demo product data for the shop UI kit (no photos — kraft placeholders).
window.SHOP_PRODUCTS = [{
  id: 1,
  name: "Мигдаль сирий",
  category: "Горіхи",
  cat: "nuts",
  price: 289,
  unit: "кг",
  badge: {
    text: "Хіт",
    tone: "marigold"
  },
  rating: 4.8,
  reviews: 128,
  desc: "Добірний сирий мигдаль без обсмажування та солі. Ідеальний для випічки, гранол і просто так."
}, {
  id: 2,
  name: "Курага домашня",
  category: "Сухофрукти",
  cat: "dry",
  price: 189,
  oldPrice: 239,
  unit: "кг",
  badge: {
    text: "−20%",
    tone: "sale"
  },
  rating: 4.9,
  reviews: 214,
  desc: "В'ялені абрикоси без цукру та діоксиду сірки. Сушені на сонці, м'які й ароматні."
}, {
  id: 3,
  name: "Чай гірський «Карпатський»",
  category: "Чай",
  cat: "tea",
  price: 145,
  unit: "уп",
  badge: {
    text: "Еко",
    tone: "fresh"
  },
  rating: 5.0,
  reviews: 76,
  desc: "Збір карпатських трав: чебрець, звіробій, м'ята. Зігріває осінніми вечорами."
}, {
  id: 4,
  name: "Волоські горіхи",
  category: "Горіхи",
  cat: "nuts",
  price: 249,
  unit: "кг",
  rating: 4.7,
  reviews: 93,
  desc: "Світлі ядра волоського горіха врожаю цього року. Чищені вручну."
}, {
  id: 5,
  name: "Аніс зірчастий (бадьян)",
  category: "Спеції",
  cat: "spice",
  price: 320,
  unit: "кг",
  badge: {
    text: "Новинка",
    tone: "ink"
  },
  rating: 4.9,
  reviews: 41,
  desc: "Ціла зірочка бадьяну — теплий пряний аромат для глінтвейну, випічки та узвару."
}, {
  id: 6,
  name: "Фінік королівський",
  category: "Сухофрукти",
  cat: "dry",
  price: 279,
  unit: "кг",
  rating: 4.8,
  reviews: 156,
  desc: "Великі м'які фініки сорту Меджул. Натуральна карамельна солодкість."
}, {
  id: 7,
  name: "Олія гарбузова",
  category: "Олії",
  cat: "oil",
  price: 210,
  unit: "500мл",
  badge: {
    text: "Еко",
    tone: "fresh"
  },
  rating: 4.9,
  reviews: 58,
  desc: "Холодний віджим, темна густа олія з горіховим смаком. До салатів та каш."
}, {
  id: 8,
  name: "Кеш'ю смажений",
  category: "Горіхи",
  cat: "nuts",
  price: 359,
  unit: "кг",
  rating: 4.6,
  reviews: 87,
  desc: "Легко підсмажений кеш'ю без солі. Хрусткий та маслянистий."
}, {
  id: 9,
  name: "Журавлина в'ялена",
  category: "Сухофрукти",
  cat: "dry",
  price: 235,
  unit: "кг",
  rating: 4.7,
  reviews: 102,
  desc: "В'ялена журавлина з легкою кислинкою. До вівсянки, випічки та сиру."
}, {
  id: 10,
  name: "Набір «Затишна осінь»",
  category: "Набори",
  cat: "gift",
  price: 640,
  unit: "шт",
  badge: {
    text: "Подарунок",
    tone: "marigold"
  },
  rating: 5.0,
  reviews: 34,
  desc: "Крафтова коробка: курага, горіхи, карпатський чай і бадьян. Готовий подарунок."
}, {
  id: 11,
  name: "Родзинки золоті",
  category: "Сухофрукти",
  cat: "dry",
  price: 165,
  unit: "кг",
  rating: 4.6,
  reviews: 71,
  desc: "Світлий кишміш без кісточок. Солодкий, соковитий, для випічки та узвару."
}, {
  id: 12,
  name: "Суміш спецій для глінтвейну",
  category: "Спеції",
  cat: "spice",
  price: 175,
  unit: "уп",
  rating: 4.9,
  reviews: 63,
  desc: "Бадьян, кориця, гвоздика, цедра. Просто додайте до вина чи узвару."
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shop/products.js", error: String((e && e.message) || e) }); }

__ds_ns.PriceTag = __ds_scope.PriceTag;

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.Rating = __ds_scope.Rating;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.QuantityStepper = __ds_scope.QuantityStepper;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

})();
