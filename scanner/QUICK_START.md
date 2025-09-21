# 🚀 OMR Scanner - Quick Deploy Guide

## ⚡ Deploy in 5 Minutes

### Option 1: Render (Easiest - Free)

1. **Go to [render.com](https://render.com)** and sign up
2. **Click "New +" → "Web Service"**
3. **Connect GitHub** and select your repository
4. **Set Root Directory:** `scanner`
5. **Use these settings:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python omr_web_circle_scanner.py`
6. **Click "Create Web Service"**
7. **Wait 2-3 minutes** for deployment
8. **Your OMR scanner is live!** 🎉

**Result:** `https://your-app-name.onrender.com`

---

### Option 2: Railway (Fastest)

1. **Go to [railway.app](https://railway.app)** and sign up
2. **Click "New Project" → "Deploy from GitHub repo"**
3. **Select your repository** and choose the `scanner` folder
4. **Railway auto-detects everything** - just click Deploy!
5. **Your OMR scanner is live!** 🎉

**Result:** `https://your-app-name.railway.app`

---

## 📱 Test Your Deployment

1. **Open the URL** in any browser
2. **Upload an OMR form image** or use webcam
3. **See the results** instantly!

## 🔗 Integration with Your POS

Once deployed, your OMR scanner can be integrated with your existing POS system:

```javascript
// In your POS system, open the scanner
const scannerUrl = 'https://your-omr-scanner.onrender.com';
window.open(scannerUrl, '_blank', 'width=1000,height=800');

// Listen for results
window.addEventListener('message', (event) => {
    if (event.data.type === 'OMR_SCAN_RESULT') {
        const items = event.data.results.shaded_selections;
        // Add items to your POS system
        items.forEach(item => {
            addToCart(item.item, item.fill_percent);
        });
    }
});
```

## 🛠️ Troubleshooting

**If deployment fails:**
1. Check that all files are in the `scanner` folder
2. Ensure `requirements.txt` has all dependencies
3. Check the deployment logs for errors

**If scanner doesn't work:**
1. Test with the provided `test_deployment.html` file
2. Check that the server URL is correct
3. Verify image upload permissions

## 📞 Need Help?

- **Detailed Guide:** See `DEPLOYMENT.md`
- **Test Your Deployment:** Use `test_deployment.html`
- **Deployment Helper:** Run `python deploy.py`

---

## 🎯 What You Get

✅ **Web-based OMR scanner** accessible from any device  
✅ **Real-time webcam scanning** for mobile devices  
✅ **Automatic circle detection** and item recognition  
✅ **POS system integration** with results transfer  
✅ **Free hosting** on Render or Railway  
✅ **No server maintenance** required  

**Your OMR scanner is now online and ready to use!** 🚀
